"""
Vector Database Module - Interfaces and implementations for vector databases.

This module provides:
    - IVectorDBService: Abstract interface for vector database operations.
    - QdrantService: Qdrant implementation of IVectorDBService.
    - QdrantConfig: Configuration dataclass for Qdrant connections.
    - VectorDBFactory: Factory for creating vector database service instances.
    - Constants: Common vector database constants.

Usage:
    from libs.data.vector import IVectorDBService, QdrantService, QdrantConfig

    # Using configuration service
    service = await QdrantService.create_sync(config_service)

    # Using direct config
    config = QdrantConfig(host="localhost", port=6333, api_key="...")
    service = await QdrantService.create_sync(config)

    # Using factory
    from libs.data.vector import VectorDBFactory
    service = await VectorDBFactory.create_vector_db_service("qdrant", config_service)
"""

from libs.data.vector.interface import IVectorDBService, FilterValue
from libs.data.vector.qdrant_service import QdrantService
from libs.data.vector.config import QdrantConfig
from libs.data.vector.filter import QdrantFilterMode
from libs.data.vector.factory import VectorDBFactory
from libs.data.vector.constants import (
    VIRTUAL_RECORD_ID_FIELD,
    ORG_ID_FIELD,
    VECTOR_DB_SERVICE_NAME,
    VECTOR_DB_COLLECTION_NAME,
)

__all__ = [
    # Interface
    "IVectorDBService",
    "FilterValue",
    # Qdrant implementation
    "QdrantService",
    "QdrantConfig",
    "QdrantFilterMode",
    # Factory
    "VectorDBFactory",
    # Constants
    "VIRTUAL_RECORD_ID_FIELD",
    "ORG_ID_FIELD",
    "VECTOR_DB_SERVICE_NAME",
    "VECTOR_DB_COLLECTION_NAME",
]

