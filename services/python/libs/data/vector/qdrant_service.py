"""
Qdrant Service - Implementation of IVectorDBService for Qdrant.

This module provides the Qdrant implementation of the vector database interface,
supporting both sync and async clients with parallel batch uploads.

Usage:
    from libs.data.vector import QdrantService, QdrantConfig

    # Using configuration service
    service = await QdrantService.create_sync(config_service)

    # Using direct config
    config = QdrantConfig(host="localhost", port=6333)
    service = await QdrantService.create_sync(config)

    # Upsert vectors
    service.upsert_points("my_collection", points)
"""

import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple, Union

from qdrant_client import AsyncQdrantClient, QdrantClient  # type: ignore
from qdrant_client.http.models import (  # type: ignore
    Distance,
    Filter,
    FilterSelector,
    KeywordIndexParams,
    KeywordIndexType,
    Modifier,
    OptimizersConfigDiff,
    PointStruct,
    QueryRequest,
    ScalarQuantization,
    ScalarQuantizationConfig,
    ScalarType,
    SparseIndexParams,
    SparseVectorParams,
    VectorParams,
)

from libs.core.logging import create_logger
from libs.core.constants import ConfigPath
from libs.data.vector.config import QdrantConfig
from libs.data.vector.filter import QdrantFilterMode, QdrantUtils
from libs.data.vector.interface import FilterValue, IVectorDBService

# Default collection name
VECTOR_DB_COLLECTION_NAME = "enterprise_search"

logger = create_logger("qdrant_service")


class QdrantService(IVectorDBService):
    """
    Qdrant implementation of the IVectorDBService interface.

    This service provides vector operations for Qdrant, supporting both
    synchronous and asynchronous clients with optimized batch uploads.

    Attributes:
        config_service: Configuration source (QdrantConfig or ConfigurationService).
        client: Qdrant client instance (sync or async).
        is_async: Whether using async client.

    Example:
        >>> service = await QdrantService.create_sync(config_service)
        >>> await service.create_collection("my_collection", embedding_size=1536)
        >>> service.upsert_points("my_collection", points)
    """

    def __init__(
        self,
        config_service: Union[QdrantConfig, Any],  # Any = ConfigurationService
        is_async: bool = False,
    ) -> None:
        """
        Initialize QdrantService.

        Note: Use create_sync() or create_async() factory methods.

        Args:
            config_service: QdrantConfig or ConfigurationService instance.
            is_async: Whether to use async client.
        """
        self.config_service = config_service
        self.client: Optional[Union[QdrantClient, AsyncQdrantClient]] = None
        self.is_async = is_async

    # -------------------------------------------------------------------------
    # Factory Methods
    # -------------------------------------------------------------------------

    @classmethod
    async def create_sync(
        cls,
        config: Union[QdrantConfig, Any],
    ) -> "QdrantService":
        """
        Factory method to create a QdrantService with sync client.

        Args:
            config: QdrantConfig or ConfigurationService instance.

        Returns:
            Initialized QdrantService with sync client.
        """
        service = cls(config, is_async=False)
        await service.connect_sync()
        return service

    @classmethod
    async def create_async(
        cls,
        config: Union[QdrantConfig, Any],
    ) -> "QdrantService":
        """
        Factory method to create a QdrantService with async client.

        Args:
            config: QdrantConfig or ConfigurationService instance.

        Returns:
            Initialized QdrantService with async client.
        """
        service = cls(config, is_async=True)
        await service.connect_async()
        return service

    # -------------------------------------------------------------------------
    # Connection Management
    # -------------------------------------------------------------------------

    async def connect(self) -> None:
        """Connect using the configured client type."""
        if self.is_async:
            await self.connect_async()
        else:
            await self.connect_sync()

    def _resolve_api_key(self, config_api_key: Optional[str]) -> Optional[str]:
        """
        Resolve API key with environment variable override.
        
        Priority:
        1. QDRANT_API_KEY env var (if set, even if empty)
        2. Config from ETCD
        
        Returns None for empty values to disable auth.
        """
        # Check env var first (allows override of ETCD config)
        env_api_key = os.environ.get("QDRANT_API_KEY")
        if env_api_key is not None:
            # Env var is set - use it (empty string = no auth)
            api_key = env_api_key if env_api_key else None
        else:
            # Fall back to config
            api_key = config_api_key
            
        return api_key or None

    def _resolve_prefer_grpc(self, config_prefer_grpc: Optional[bool] = None) -> bool:
        """
        Resolve prefer_grpc setting with environment variable override.
        
        Priority:
        1. QDRANT_PREFER_GRPC env var (if set)
        2. Config from ETCD
        3. Default: True
        
        Set QDRANT_PREFER_GRPC=false for local development without gRPC auth.
        """
        env_prefer_grpc = os.environ.get("QDRANT_PREFER_GRPC")
        if env_prefer_grpc is not None:
            return env_prefer_grpc.lower() in ("true", "1", "yes")
        
        if config_prefer_grpc is not None:
            return config_prefer_grpc
            
        return True  # Default to gRPC for better performance

    async def connect_sync(self) -> None:
        """Connect to Qdrant using sync client."""
        try:
            qdrant_config = await self._get_config()
            if not qdrant_config:
                raise ValueError("Qdrant configuration not found")

            # Resolve API key and prefer_grpc with env var override
            api_key = self._resolve_api_key(qdrant_config.get("apiKey"))
            prefer_grpc = self._resolve_prefer_grpc(qdrant_config.get("preferGrpc"))
            
            client_kwargs = {
                "host": qdrant_config.get("host"),
                "port": qdrant_config.get("port"),
                "api_key": api_key,
                "prefer_grpc": prefer_grpc,
                "https": False,
                "timeout": 300,
            }
            
            # Only add gRPC options if using gRPC
            if prefer_grpc:
                client_kwargs["grpc_options"] = {
                    "grpc.max_send_message_length": 64 * 1024 * 1024,  # 64MB
                    "grpc.max_receive_message_length": 64 * 1024 * 1024,
                    "grpc.keepalive_time_ms": 30000,
                    "grpc.keepalive_timeout_ms": 10000,
                    "grpc.http2.max_pings_without_data": 0,
                    "grpc.keepalive_permit_without_calls": 1,
                }
            
            self.client = QdrantClient(**client_kwargs)
            logger.info(f"✅ Connected to Qdrant successfully (prefer_grpc={prefer_grpc})")

        except Exception as e:
            logger.error(f"❌ Failed to connect to Qdrant: {e}")
            raise

    async def connect_async(self) -> None:
        """Connect to Qdrant using async client."""
        try:
            qdrant_config = await self._get_config()
            if not qdrant_config:
                raise ValueError("Qdrant configuration not found")

            # Resolve API key and prefer_grpc with env var override
            api_key = self._resolve_api_key(qdrant_config.get("apiKey"))
            prefer_grpc = self._resolve_prefer_grpc(qdrant_config.get("preferGrpc"))
            
            client_kwargs = {
                "host": qdrant_config.get("host"),
                "port": qdrant_config.get("port"),
                "api_key": api_key,
                "prefer_grpc": prefer_grpc,
                "https": False,
                "timeout": 300,
            }
            
            # Only add gRPC options if using gRPC
            if prefer_grpc:
                client_kwargs["grpc_options"] = {
                    "grpc.max_send_message_length": 64 * 1024 * 1024,  # 64MB
                    "grpc.max_receive_message_length": 64 * 1024 * 1024,
                    "grpc.keepalive_time_ms": 30000,
                    "grpc.keepalive_timeout_ms": 10000,
                    "grpc.http2.max_pings_without_data": 0,
                    "grpc.keepalive_permit_without_calls": 1,
                }
            
            self.client = AsyncQdrantClient(**client_kwargs)
            logger.info(f"✅ Connected to Qdrant with async client successfully (prefer_grpc={prefer_grpc})")

        except Exception as e:
            logger.error(f"❌ Failed to connect to Qdrant with async client: {e}")
            raise

    async def disconnect(self) -> None:
        """Disconnect from Qdrant."""
        if self.client is not None:
            try:
                self.client.close()
                logger.info("✅ Disconnected from Qdrant successfully")
            except Exception as e:
                logger.warning(f"⚠️ Error during disconnect (likely harmless): {e}")
            finally:
                self.client = None

    def get_service_name(self) -> str:
        """Get the service name."""
        return "qdrant"

    def get_service(self) -> "QdrantService":
        """Get the service instance."""
        return self

    def get_service_client(self) -> Union[QdrantClient, AsyncQdrantClient]:
        """Get the underlying Qdrant client."""
        return self.client  # type: ignore

    # -------------------------------------------------------------------------
    # Collection Operations
    # -------------------------------------------------------------------------

    async def get_collections(self) -> object:
        """Get all collections."""
        self._ensure_connected()
        return self.client.get_collections()  # type: ignore

    async def get_collection(self, collection_name: str) -> object:
        """Get a specific collection."""
        self._ensure_connected()
        return self.client.get_collection(collection_name)  # type: ignore

    async def delete_collection(self, collection_name: str) -> None:
        """Delete a collection."""
        self._ensure_connected()
        self.client.delete_collection(collection_name)  # type: ignore

    async def create_collection(
        self,
        collection_name: str = VECTOR_DB_COLLECTION_NAME,
        embedding_size: int = 1024,
        sparse_idf: bool = False,
        vectors_config: Optional[dict] = None,
        sparse_vectors_config: Optional[dict] = None,
        optimizers_config: Optional[dict] = None,
        quantization_config: Optional[dict] = None,
    ) -> None:
        """
        Create a collection with default vector configuration if not provided.

        Args:
            collection_name: Name of the collection.
            embedding_size: Dimension of dense vectors.
            sparse_idf: Whether to use IDF for sparse vectors.
            vectors_config: Custom vector configuration.
            sparse_vectors_config: Custom sparse vector configuration.
            optimizers_config: Custom optimizer configuration.
            quantization_config: Custom quantization configuration.
        """
        self._ensure_connected()

        # Set defaults if not provided
        if vectors_config is None:
            vectors_config = {
                "dense": VectorParams(size=embedding_size, distance=Distance.COSINE)
            }

        if sparse_vectors_config is None:
            sparse_vectors_config = {
                "sparse": SparseVectorParams(
                    index=SparseIndexParams(on_disk=False),
                    modifier=Modifier.IDF if sparse_idf else None,
                )
            }

        if optimizers_config is None:
            optimizers_config = OptimizersConfigDiff(default_segment_number=8)

        if quantization_config is None:
            quantization_config = ScalarQuantization(
                scalar=ScalarQuantizationConfig(
                    type=ScalarType.INT8,
                    quantile=0.95,
                    always_ram=True,
                )
            )

        self.client.create_collection(  # type: ignore
            collection_name=collection_name,
            vectors_config=vectors_config,
            sparse_vectors_config=sparse_vectors_config,
            optimizers_config=optimizers_config,
            quantization_config=quantization_config,
        )
        logger.info(f"✅ Created collection {collection_name}")

    # -------------------------------------------------------------------------
    # Index Operations
    # -------------------------------------------------------------------------

    async def create_index(
        self,
        collection_name: str,
        field_name: str,
        field_schema: dict,
    ) -> None:
        """Create a payload index on a field."""
        self._ensure_connected()

        if field_schema.get("type") == "keyword":
            field_schema = KeywordIndexParams(type=KeywordIndexType.KEYWORD)

        self.client.create_payload_index(  # type: ignore
            collection_name, field_name, field_schema
        )

    # -------------------------------------------------------------------------
    # Filter Operations
    # -------------------------------------------------------------------------

    async def filter_collection(
        self,
        filter_mode: Union[str, QdrantFilterMode] = QdrantFilterMode.MUST,
        must: Optional[Dict[str, FilterValue]] = None,
        should: Optional[Dict[str, FilterValue]] = None,
        must_not: Optional[Dict[str, FilterValue]] = None,
        min_should_match: Optional[int] = None,
        **kwargs: FilterValue,
    ) -> Filter:
        """
        Build a filter for collection queries.

        Supports must (AND), should (OR), and must_not (NOT) conditions.

        Args:
            filter_mode: Default mode for kwargs filters.
            must: Conditions that MUST all be true.
            should: Conditions where at least one SHOULD be true.
            must_not: Conditions that MUST NOT be true.
            min_should_match: Minimum should conditions to match.
            **kwargs: Additional filters using the default mode.

        Returns:
            Qdrant Filter object.

        Example:
            >>> filter = await service.filter_collection(
            ...     must={"orgId": "123"},
            ...     should={"department": "IT", "role": "admin"},
            ...     must_not={"status": "deleted"}
            ... )
        """
        self._ensure_connected()

        # Convert string mode to enum
        if isinstance(filter_mode, str):
            try:
                filter_mode = QdrantFilterMode(filter_mode.lower())
            except ValueError:
                raise ValueError(
                    f"Invalid mode '{filter_mode}'. Must be 'must', 'should', or 'must_not'"
                )

        # Initialize filter dictionaries
        all_must_filters = dict(must) if must else {}
        all_should_filters = dict(should) if should else {}
        all_must_not_filters = dict(must_not) if must_not else {}

        # Add kwargs to appropriate filter group
        if kwargs:
            if filter_mode == QdrantFilterMode.MUST:
                all_must_filters.update(kwargs)
            elif filter_mode == QdrantFilterMode.SHOULD:
                all_should_filters.update(kwargs)
            elif filter_mode == QdrantFilterMode.MUST_NOT:
                all_must_not_filters.update(kwargs)

        # Build conditions
        must_conditions = (
            QdrantUtils.build_conditions(all_must_filters) if all_must_filters else []
        )
        should_conditions = (
            QdrantUtils.build_conditions(all_should_filters)
            if all_should_filters
            else []
        )
        must_not_conditions = (
            QdrantUtils.build_conditions(all_must_not_filters)
            if all_must_not_filters
            else []
        )

        # Validate we have conditions
        if not must_conditions and not should_conditions and not must_not_conditions:
            logger.warning("No filters provided - returning empty filter")
            return Filter(should=[])

        # Build filter
        filter_parts: Dict[str, Any] = {}

        if must_conditions:
            filter_parts["must"] = must_conditions

        if should_conditions:
            filter_parts["should"] = should_conditions
            if min_should_match is not None:
                filter_parts["min_should_match"] = min_should_match

        if must_not_conditions:
            filter_parts["must_not"] = must_not_conditions

        return Filter(**filter_parts)

    # -------------------------------------------------------------------------
    # Query Operations
    # -------------------------------------------------------------------------

    async def scroll(
        self,
        collection_name: str,
        scroll_filter: Filter,
        limit: int,
    ) -> object:
        """Scroll through collection points."""
        self._ensure_connected()
        return self.client.scroll(collection_name, scroll_filter, limit)  # type: ignore

    def query_nearest_points(
        self,
        collection_name: str,
        requests: List[QueryRequest],
    ) -> List[List[PointStruct]]:
        """Query batch points for nearest neighbors."""
        self._ensure_connected()
        return self.client.query_batch_points(collection_name, requests)  # type: ignore

    # -------------------------------------------------------------------------
    # Point Operations
    # -------------------------------------------------------------------------

    def upsert_points(
        self,
        collection_name: str,
        points: List[PointStruct],
        batch_size: int = 1000,
        max_workers: int = 5,
    ) -> None:
        """
        Upsert points with parallel batching for better performance.

        Args:
            collection_name: Name of the collection.
            points: List of points to upsert.
            batch_size: Number of points per batch (default: 1000).
            max_workers: Number of parallel upload threads (default: 5).
        """
        self._ensure_connected()

        start_time = time.perf_counter()
        total_points = len(points)
        logger.info(
            f"⏱️ Starting upsert of {total_points} points to '{collection_name}' "
            f"(batch size: {batch_size}, workers: {max_workers})"
        )

        # Single batch upload
        if total_points <= batch_size:
            self.client.upsert(collection_name, points)  # type: ignore
        else:
            # Split into batches
            batches: List[Tuple[int, List[PointStruct]]] = []
            for i in range(0, total_points, batch_size):
                batch_end = min(i + batch_size, total_points)
                batch = points[i:batch_end]
                batch_num = (i // batch_size) + 1
                batches.append((batch_num, batch))

            total_batches = len(batches)
            completed_batches = 0

            def upload_batch(
                batch_info: Tuple[int, List[PointStruct]]
            ) -> Tuple[int, int, float]:
                batch_num, batch = batch_info
                batch_start = time.perf_counter()
                self.client.upsert(collection_name, batch)  # type: ignore
                batch_elapsed = time.perf_counter() - batch_start
                return batch_num, len(batch), batch_elapsed

            # Parallel upload
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(upload_batch, batch_info): batch_info
                    for batch_info in batches
                }
                for future in as_completed(futures):
                    try:
                        batch_num, batch_size_actual, batch_elapsed = future.result()
                        completed_batches += 1
                        throughput = (
                            batch_size_actual / batch_elapsed
                            if batch_elapsed > 0
                            else 0
                        )
                        logger.info(
                            f"📦 Batch {batch_num}/{total_batches}: {batch_size_actual} points "
                            f"in {batch_elapsed:.2f}s ({throughput:.1f} pts/s) "
                            f"[{completed_batches}/{total_batches}]"
                        )
                    except Exception as e:
                        batch_info = futures[future]
                        logger.error(f"❌ Failed to upload batch {batch_info[0]}: {e}")
                        raise

        elapsed_time = time.perf_counter() - start_time
        throughput = total_points / elapsed_time if elapsed_time > 0 else 0
        logger.info(
            f"✅ Completed upsert of {total_points} points in {elapsed_time:.2f}s "
            f"(throughput: {throughput:.1f} pts/s)"
        )

    def overwrite_payload(
        self,
        collection_name: str,
        payload: dict,
        points: Filter,
    ) -> None:
        """Overwrite payload for matching points."""
        self._ensure_connected()
        self.client.overwrite_payload(collection_name, payload, points)  # type: ignore

    def set_payload(
        self,
        collection_name: str,
        payload: dict,
        points: Filter,
    ) -> None:
        """
        Set (partial update) payload for matching points.
        
        Unlike overwrite_payload, this only updates the specified fields
        without removing other existing payload fields.
        
        ACL Push-Down: Used to update access_control_list without re-embedding vectors.
        
        Args:
            collection_name: Name of the collection.
            payload: Payload fields to set/update.
            points: Filter to select points to update.
        """
        self._ensure_connected()
        self.client.set_payload(  # type: ignore
            collection_name=collection_name,
            payload=payload,
            points=FilterSelector(filter=points),
        )
        logger.info(f"✅ Updated payload for points in collection '{collection_name}'")

    def delete_points(
        self,
        collection_name: str,
        filter: Filter,
    ) -> None:
        """Delete points matching a filter."""
        self._ensure_connected()
        self.client.delete(  # type: ignore
            collection_name=collection_name,
            points_selector=FilterSelector(filter=filter),
        )
        logger.info(f"✅ Deleted points from collection '{collection_name}'")

    # -------------------------------------------------------------------------
    # Private Methods
    # -------------------------------------------------------------------------

    def _ensure_connected(self) -> None:
        """Ensure client is connected."""
        if self.client is None:
            raise RuntimeError("Client not connected. Call connect() first.")

    async def _get_config(self) -> Dict[str, Any]:
        """Get Qdrant configuration from the config source."""
        if isinstance(self.config_service, QdrantConfig):
            return self.config_service.qdrant_config
        else:
            # Assume it's a ConfigurationService
            return await self.config_service.get_config(ConfigPath.QDRANT.value)

