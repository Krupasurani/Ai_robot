"""
Base Service Container - Foundation for dependency injection.

This module provides a base container class that sets up common dependencies
using the new libs structure. Services should extend this class and add
their specific providers.

Usage:
    from libs.containers import BaseServiceContainer
    from dependency_injector import providers

    class QueryServiceContainer(BaseServiceContainer):
        # Add query-specific providers
        retrieval_service = providers.Resource(...)
"""

import asyncio
from typing import Type, TypeVar

from arango import ArangoClient  # type: ignore
from dependency_injector import containers, providers  # type: ignore
from redis import asyncio as aioredis  # type: ignore
from redis.asyncio import Redis  # type: ignore

from libs.core import ConfigPath, create_logger
from libs.core.config import ConfigurationService

T = TypeVar("T", bound="BaseServiceContainer")


class BaseServiceContainer(containers.DeclarativeContainer):
    """
    Base container with common providers for all services.

    This container provides:
        - Logger: Service-specific logging.
        - ConfigurationService: Configuration management.
        - ArangoClient: Graph database client.
        - RedisClient: Cache client.

    Services should extend this class and add their specific providers.

    Example:
        >>> class MyServiceContainer(BaseServiceContainer):
        ...     logger = providers.Singleton(create_logger, "my_service")
        ...
        ...     my_service = providers.Resource(
        ...         create_my_service,
        ...         config_service=BaseServiceContainer.config_service
        ...     )
    """

    # Common locks for thread-safe cache access
    service_creds_lock = providers.Singleton(asyncio.Lock)
    user_creds_lock = providers.Singleton(asyncio.Lock)

    # Logger - Override in child containers with service-specific name
    logger = providers.Singleton(create_logger, "base_service")

    # Configuration service - uses the new libs structure
    config_service = providers.Singleton(ConfigurationService, logger=logger)

    # -------------------------------------------------------------------------
    # Factory Methods for External Services
    # -------------------------------------------------------------------------

    @staticmethod
    async def _create_arango_client(config_service: ConfigurationService) -> ArangoClient:
        """
        Async factory method to initialize ArangoClient.

        Args:
            config_service: Configuration service instance.

        Returns:
            Initialized ArangoDB client.
        """
        arangodb_config = await config_service.get_config(ConfigPath.ARANGODB.value)
        hosts = arangodb_config["url"]
        return ArangoClient(hosts=hosts)

    @staticmethod
    async def _create_redis_client(config_service: ConfigurationService) -> Redis:
        """
        Async factory method to initialize Redis client.

        Args:
            config_service: Configuration service instance.

        Returns:
            Initialized Redis client.
        """
        from libs.core.utils import build_redis_url

        redis_config = await config_service.get_config(ConfigPath.REDIS.value)
        url = build_redis_url(redis_config)
        return await aioredis.from_url(url, encoding="utf-8", decode_responses=True)

    # External service providers
    arango_client = providers.Resource(
        _create_arango_client, config_service=config_service
    )
    redis_client = providers.Resource(
        _create_redis_client, config_service=config_service
    )

    # -------------------------------------------------------------------------
    # Factory Method for Container Initialization
    # -------------------------------------------------------------------------

    @classmethod
    def init(cls: Type[T], service_name: str) -> T:
        """
        Initialize the container with the given service name.

        Args:
            service_name: Name of the service for logging.

        Returns:
            Initialized container instance.

        Example:
            >>> container = MyServiceContainer.init("my_service")
        """
        container = cls()
        container.logger().info(f"🚀 Initializing {cls.__name__} for {service_name}")
        return container

