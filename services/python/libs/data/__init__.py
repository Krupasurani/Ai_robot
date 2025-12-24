"""
Data Library - Database clients, interfaces, and implementations.

This module provides unified interfaces and implementations for all database
operations across the backend services.

Submodules:
    - graph: Graph database interfaces and ArangoDB implementation.
    - vector: Vector database interfaces and Qdrant implementation.
    - cache: Redis cache utilities and helpers.

Usage:
    from libs.data.graph import IGraphService, ArangoService
    from libs.data.vector import IVectorDBService, QdrantService
"""

from libs.data.graph import IGraphService, ArangoService, ArangoConfig
from libs.data.vector import IVectorDBService, QdrantService, QdrantConfig

__all__ = [
    # Graph DB
    "IGraphService",
    "ArangoService",
    "ArangoConfig",
    # Vector DB
    "IVectorDBService",
    "QdrantService",
    "QdrantConfig",
]

