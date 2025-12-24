"""
Graph Database Module - Interfaces and implementations for graph databases.

This module provides:
    - IGraphService: Abstract interface for graph database operations.
    - ArangoService: ArangoDB implementation of IGraphService.
    - ArangoConfig: Configuration dataclass for ArangoDB connections.

Usage:
    from libs.data.graph import IGraphService, ArangoService, ArangoConfig

    # Using configuration service
    service = await ArangoService.create(logger, config_service)
    await service.connect()

    # Using direct config
    config = ArangoConfig(url="http://localhost:8529", db="mydb", ...)
    service = await ArangoService.create(logger, config)
"""

from libs.data.graph.interface import IGraphService
from libs.data.graph.arango_service import ArangoService
from libs.data.graph.config import ArangoConfig

__all__ = [
    "IGraphService",
    "ArangoService",
    "ArangoConfig",
]

