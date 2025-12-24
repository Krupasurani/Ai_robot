"""
Vector Database Interface - Abstract base class for vector database operations.

This module defines the contract that all vector database implementations must follow,
ensuring consistent behavior across different backends (Qdrant, Weaviate, Pinecone, etc.).

Usage:
    from libs.data.vector import IVectorDBService

    class MyVectorDB(IVectorDBService):
        async def connect(self) -> None:
            # Implementation
            pass
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Union

from qdrant_client.http.models import (  # type: ignore
    Filter,
    PointStruct,
    QueryRequest,
)

from libs.data.vector.filter import QdrantFilterMode

# Type alias for filter values
FilterValue = Union[str, int, float, bool, List[Union[str, int, float, bool]]]


class IVectorDBService(ABC):
    """
    Abstract interface for vector database operations.

    This interface defines the contract for vector database implementations,
    providing methods for:
        - Connection management
        - Collection operations (CRUD)
        - Index management
        - Vector search and filtering
        - Point operations (upsert, query, delete)

    Implementations:
        - QdrantService: Qdrant implementation

    Example:
        >>> class CustomVectorDB(IVectorDBService):
        ...     async def connect(self) -> None:
        ...         self.client = await create_connection()
    """

    # -------------------------------------------------------------------------
    # Connection Management
    # -------------------------------------------------------------------------

    @abstractmethod
    async def connect(self) -> None:
        """
        Establish connection to the vector database.

        Raises:
            ConnectionError: If connection fails.
        """
        raise NotImplementedError("connect() is not implemented")

    @abstractmethod
    async def disconnect(self) -> None:
        """
        Close connection to the vector database.
        """
        raise NotImplementedError("disconnect() is not implemented")

    @abstractmethod
    def get_service_name(self) -> str:
        """
        Get the name of the vector database service.

        Returns:
            Service name (e.g., "qdrant", "weaviate").
        """
        raise NotImplementedError("get_service_name() is not implemented")

    @abstractmethod
    def get_service(self) -> "IVectorDBService":
        """
        Get the service instance.

        Returns:
            Self reference for method chaining.
        """
        raise NotImplementedError("get_service() is not implemented")

    @abstractmethod
    def get_service_client(self) -> object:
        """
        Get the underlying database client instance.

        Returns:
            The native database client object.
        """
        raise NotImplementedError("get_service_client() is not implemented")

    # -------------------------------------------------------------------------
    # Collection Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_collection(
        self,
        collection_name: str,
        embedding_size: int = 1024,
        sparse_idf: bool = False,
        vectors_config: Optional[dict] = None,
        sparse_vectors_config: Optional[dict] = None,
        optimizers_config: Optional[dict] = None,
        quantization_config: Optional[dict] = None,
    ) -> None:
        """
        Create a new vector collection.

        Args:
            collection_name: Name of the collection to create.
            embedding_size: Dimension of the dense vectors (default: 1024).
            sparse_idf: Whether to use IDF modifier for sparse vectors.
            vectors_config: Optional custom vector configuration.
            sparse_vectors_config: Optional sparse vector configuration.
            optimizers_config: Optional optimizer settings.
            quantization_config: Optional quantization settings.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("create_collection() is not implemented")

    @abstractmethod
    async def get_collections(self) -> object:
        """
        Get all collections in the database.

        Returns:
            Collection information object.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("get_collections() is not implemented")

    @abstractmethod
    async def get_collection(self, collection_name: str) -> object:
        """
        Get information about a specific collection.

        Args:
            collection_name: Name of the collection.

        Returns:
            Collection information object.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("get_collection() is not implemented")

    @abstractmethod
    async def delete_collection(self, collection_name: str) -> None:
        """
        Delete a collection.

        Args:
            collection_name: Name of the collection to delete.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("delete_collection() is not implemented")

    # -------------------------------------------------------------------------
    # Index Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def create_index(
        self,
        collection_name: str,
        field_name: str,
        field_schema: dict,
    ) -> None:
        """
        Create a payload index on a collection field.

        Args:
            collection_name: Name of the collection.
            field_name: Name of the field to index.
            field_schema: Schema definition for the index.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("create_index() is not implemented")

    # -------------------------------------------------------------------------
    # Filter Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def filter_collection(
        self,
        filter_mode: Union[str, QdrantFilterMode] = QdrantFilterMode.MUST,
        must: Optional[Dict[str, FilterValue]] = None,
        should: Optional[Dict[str, FilterValue]] = None,
        must_not: Optional[Dict[str, FilterValue]] = None,
        min_should_match: Optional[int] = None,
        **filters: FilterValue,
    ) -> Filter:
        """
        Build a filter for collection queries.

        Args:
            filter_mode: Default mode for kwargs filters.
            must: Conditions that MUST all be true (AND).
            should: Conditions where at least one SHOULD be true (OR).
            must_not: Conditions that MUST NOT be true (NOT).
            min_should_match: Minimum number of should conditions to match.
            **filters: Additional filters using the default mode.

        Returns:
            Filter object for use in queries.

        Example:
            >>> filter = await service.filter_collection(
            ...     must={"orgId": "123"},
            ...     should={"status": ["active", "pending"]},
            ...     must_not={"deleted": True}
            ... )
        """
        raise NotImplementedError("filter_collection() is not implemented")

    # -------------------------------------------------------------------------
    # Query Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    async def scroll(
        self,
        collection_name: str,
        scroll_filter: Filter,
        limit: int,
    ) -> object:
        """
        Scroll through collection points matching a filter.

        Args:
            collection_name: Name of the collection.
            scroll_filter: Filter to apply.
            limit: Maximum number of points to return.

        Returns:
            Scroll result with matching points.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("scroll() is not implemented")

    @abstractmethod
    def query_nearest_points(
        self,
        collection_name: str,
        requests: List[QueryRequest],
    ) -> List[List[PointStruct]]:
        """
        Query for nearest points using batch requests.

        Args:
            collection_name: Name of the collection.
            requests: List of query requests.

        Returns:
            List of lists of matching points for each request.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("query_nearest_points() is not implemented")

    # -------------------------------------------------------------------------
    # Point Operations
    # -------------------------------------------------------------------------

    @abstractmethod
    def upsert_points(
        self,
        collection_name: str,
        points: List[PointStruct],
    ) -> None:
        """
        Insert or update points in a collection.

        Args:
            collection_name: Name of the collection.
            points: List of points to upsert.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("upsert_points() is not implemented")

    @abstractmethod
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

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("set_payload() is not implemented")

    @abstractmethod
    def delete_points(
        self,
        collection_name: str,
        filter: Filter,
    ) -> None:
        """
        Delete points matching a filter.

        Args:
            collection_name: Name of the collection.
            filter: Filter to select points to delete.

        Raises:
            RuntimeError: If client not connected.
        """
        raise NotImplementedError("delete_points() is not implemented")

