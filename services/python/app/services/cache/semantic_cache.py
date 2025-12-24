"""
Semantic Cache Service - High-performance query caching using vector similarity.

Uses a dedicated Qdrant collection to cache query-response pairs.
Cache hits are determined by vector similarity (threshold ~0.98).

Usage:
    cache = SemanticCacheService(qdrant_service, logger)
    await cache.initialize()

    # Check cache
    hit = await cache.check_cache(query_embedding, org_id)
    if hit:
        return hit["response"]

    # After computing response
    await cache.set_cache(query_embedding, response, original_query, org_id)
"""

import time
import uuid
from typing import Any, Dict, List, Optional

from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from libs.core.logging import create_logger

# Cache collection configuration
CACHE_COLLECTION_NAME = "semantic_cache"
CACHE_SIMILARITY_THRESHOLD = 0.98  # Very high threshold for cache hits
CACHE_TTL_SECONDS = 3600 * 24  # 24 hours default TTL


class SemanticCacheService:
    """
    Semantic caching service using Qdrant for vector similarity lookup.

    Caches query-response pairs and retrieves them based on semantic similarity
    rather than exact string matching. This captures the ~80% of queries that
    are semantically identical but phrased differently.

    Attributes:
        vector_db_service: Qdrant service instance.
        collection_name: Name of the cache collection.
        similarity_threshold: Minimum similarity for cache hit.
        ttl_seconds: Time-to-live for cache entries.
    """

    def __init__(
        self,
        vector_db_service: Any,  # IVectorDBService
        logger: Optional[Any] = None,
        collection_name: str = CACHE_COLLECTION_NAME,
        similarity_threshold: float = CACHE_SIMILARITY_THRESHOLD,
        ttl_seconds: int = CACHE_TTL_SECONDS,
    ) -> None:
        """
        Initialize the semantic cache service.

        Args:
            vector_db_service: Qdrant service for vector operations.
            logger: Optional logger instance.
            collection_name: Name of the cache collection.
            similarity_threshold: Minimum similarity score for cache hit (0-1).
            ttl_seconds: TTL for cache entries in seconds.
        """
        self.vector_db_service = vector_db_service
        self.logger = logger or create_logger("semantic_cache")
        self.collection_name = collection_name
        self.similarity_threshold = similarity_threshold
        self.ttl_seconds = ttl_seconds
        self._initialized = False

    async def initialize(self, embedding_size: int = 1536) -> None:
        """
        Initialize the cache collection if it doesn't exist.

        Args:
            embedding_size: Dimension of the embedding vectors.
        """
        if self._initialized:
            return

        try:
            collections = await self.vector_db_service.get_collections()
            collection_names = [col.name for col in collections.collections]

            if self.collection_name not in collection_names:
                self.logger.info(f"Creating semantic cache collection: {self.collection_name}")

                # Create collection with simple dense vector config (no sparse needed for cache)
                vectors_config = {
                    "dense": VectorParams(size=embedding_size, distance=Distance.COSINE)
                }

                await self.vector_db_service.create_collection(
                    collection_name=self.collection_name,
                    embedding_size=embedding_size,
                    vectors_config=vectors_config,
                    sparse_vectors_config={},  # No sparse vectors for cache
                )

                # Create index on orgId for filtering
                await self.vector_db_service.create_index(
                    collection_name=self.collection_name,
                    field_name="orgId",
                    field_schema={"type": "keyword"},
                )

                self.logger.info(f"✅ Semantic cache collection created: {self.collection_name}")
            else:
                self.logger.info(f"Semantic cache collection already exists: {self.collection_name}")

            self._initialized = True

        except Exception as e:
            self.logger.error(f"Failed to initialize semantic cache: {e}")
            raise

    async def check_cache(
        self,
        query_embedding: List[float],
        org_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Check if a semantically similar query exists in cache.

        Args:
            query_embedding: The query embedding vector.
            org_id: Organization ID for filtering.

        Returns:
            Cached response dict if hit, None if miss.
        """
        if not self._initialized:
            self.logger.warning("Cache not initialized, returning miss")
            return None

        try:
            from qdrant_client.http.models import QueryRequest

            # Build filter for org_id
            cache_filter = Filter(
                must=[
                    FieldCondition(
                        key="orgId",
                        match=MatchValue(value=org_id),
                    )
                ]
            )

            # Query for similar vectors
            request = QueryRequest(
                query=query_embedding,
                with_payload=True,
                limit=1,
                using="dense",
                filter=cache_filter,
                score_threshold=self.similarity_threshold,
            )

            results = self.vector_db_service.query_nearest_points(
                collection_name=self.collection_name,
                requests=[request],
            )

            if results and results[0].points:
                point = results[0].points[0]
                payload = point.payload

                # Check TTL
                created_at = payload.get("created_at", 0)
                if time.time() - created_at > self.ttl_seconds:
                    self.logger.debug(f"Cache entry expired for query (score: {point.score})")
                    return None

                self.logger.info(
                    f"🎯 Cache HIT! Score: {point.score:.4f}, "
                    f"Query: '{payload.get('original_query', '')[:50]}...'"
                )

                return {
                    "response": payload.get("response"),
                    "original_query": payload.get("original_query"),
                    "score": point.score,
                    "cached_at": created_at,
                }

            self.logger.debug("Cache MISS - no similar query found")
            return None

        except Exception as e:
            self.logger.warning(f"Cache check failed (non-fatal): {e}")
            return None

    async def set_cache(
        self,
        query_embedding: List[float],
        response: Dict[str, Any],
        original_query: str,
        org_id: str,
    ) -> bool:
        """
        Store a query-response pair in the cache.

        Args:
            query_embedding: The query embedding vector.
            response: The response to cache.
            original_query: The original query string.
            org_id: Organization ID.

        Returns:
            True if successfully cached, False otherwise.
        """
        if not self._initialized:
            self.logger.warning("Cache not initialized, skipping set")
            return False

        try:
            point_id = str(uuid.uuid4())

            point = PointStruct(
                id=point_id,
                vector={"dense": query_embedding},
                payload={
                    "response": response,
                    "original_query": original_query,
                    "orgId": org_id,
                    "created_at": time.time(),
                },
            )

            self.vector_db_service.upsert_points(
                collection_name=self.collection_name,
                points=[point],
            )

            self.logger.debug(f"✅ Cached response for query: '{original_query[:50]}...'")
            return True

        except Exception as e:
            self.logger.warning(f"Cache set failed (non-fatal): {e}")
            return False

    async def invalidate_org_cache(self, org_id: str) -> bool:
        """
        Invalidate all cache entries for an organization.

        Args:
            org_id: Organization ID to invalidate.

        Returns:
            True if successfully invalidated, False otherwise.
        """
        if not self._initialized:
            return False

        try:
            cache_filter = Filter(
                must=[
                    FieldCondition(
                        key="orgId",
                        match=MatchValue(value=org_id),
                    )
                ]
            )

            self.vector_db_service.delete_points(
                collection_name=self.collection_name,
                filter=cache_filter,
            )

            self.logger.info(f"✅ Invalidated cache for org: {org_id}")
            return True

        except Exception as e:
            self.logger.warning(f"Cache invalidation failed: {e}")
            return False

    async def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        if not self._initialized:
            return {"initialized": False}

        try:
            collection_info = await self.vector_db_service.get_collection(self.collection_name)
            return {
                "initialized": True,
                "collection_name": self.collection_name,
                "points_count": collection_info.points_count,
                "similarity_threshold": self.similarity_threshold,
                "ttl_seconds": self.ttl_seconds,
            }
        except Exception as e:
            return {"initialized": True, "error": str(e)}

