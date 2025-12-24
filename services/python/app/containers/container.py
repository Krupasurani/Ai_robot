import asyncio
from typing import Type, TypeVar

from arango import ArangoClient  # type: ignore
from dependency_injector import containers, providers  # type: ignore
from redis import asyncio as aioredis  # type: ignore
from redis.asyncio import Redis  # type: ignore

# New libs imports (with backward compatibility)
from libs.core import ConfigPath, build_redis_url, create_logger
from libs.core.config import ConfigurationService

# Backward compatibility aliases
from libs.core.constants import ConfigPath as config_node_constants  # noqa: F401

T = TypeVar("T", bound="BaseAppContainer")

class BaseAppContainer(containers.DeclarativeContainer):
    """Base container with common providers and factory methods for all services."""

    # Common locks for cache access
    service_creds_lock = providers.Singleton(asyncio.Lock)
    user_creds_lock = providers.Singleton(asyncio.Lock)

    # Common logger provider - will be overridden by child containers
    logger = providers.Singleton(create_logger, "base_service")

    # Common configuration service
    config_service = providers.Singleton(ConfigurationService, logger=logger)

    # Common factory methods for external services
    @staticmethod
    async def _create_arango_client(config_service) -> ArangoClient:
        """Async factory method to initialize ArangoClient."""
        arangodb_config = await config_service.get_config(ConfigPath.ARANGODB.value)
        hosts = arangodb_config["url"]
        return ArangoClient(hosts=hosts)

    @staticmethod
    async def _create_redis_client(config_service) -> Redis:
        """Async factory method to initialize RedisClient."""
        redis_config = await config_service.get_config(ConfigPath.REDIS.value)
        # Build Redis URL with password if provided
        url = build_redis_url(redis_config)
        return await aioredis.from_url(url, encoding="utf-8", decode_responses=True)

    # Common external service providers
    arango_client = providers.Resource(
        _create_arango_client, config_service=config_service
    )
    redis_client = providers.Resource(
        _create_redis_client, config_service=config_service
    )

    # Note: Each service container should define its own wiring_config
    # based on its specific module dependencies

    @classmethod
    def init(cls: Type[T], service_name: str) -> T:
        """Initialize the container with the given service name."""
        container = cls()
        container.logger().info(f"🚀 Initializing {cls.__name__} for {service_name}")
        return container
