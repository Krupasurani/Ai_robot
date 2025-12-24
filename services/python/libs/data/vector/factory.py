"""
Vector Database Factory - Factory for creating vector database service instances.

This module provides a centralized way to create different vector database services.
"""

from typing import TYPE_CHECKING, Union

from libs.data.vector.interface import IVectorDBService
from libs.data.vector.qdrant_service import QdrantService
from libs.data.vector.config import QdrantConfig
from libs.core.logging import create_logger

if TYPE_CHECKING:
    from libs.core.config import ConfigurationService

logger = create_logger("vector_db_factory")


class VectorDBFactory:
    """
    Factory for creating vector database service instances.

    Usage:
        # Create Qdrant service with sync client
        service = await VectorDBFactory.create_qdrant_service_sync(config_service)

        # Create Qdrant service with async client
        service = await VectorDBFactory.create_qdrant_service_async(config_service)

        # Generic factory method
        service = await VectorDBFactory.create_vector_db_service(
            "qdrant", config_service, is_async=True
        )
    """

    @staticmethod
    async def create_qdrant_service_sync(
        config: Union["ConfigurationService", QdrantConfig],
    ) -> QdrantService:
        """
        Create a QdrantService instance with synchronous client.

        Args:
            config: ConfigurationService or QdrantConfig.

        Returns:
            Initialized QdrantService instance.
        """
        return await QdrantService.create_sync(config)

    @staticmethod
    async def create_qdrant_service_async(
        config: Union["ConfigurationService", QdrantConfig],
    ) -> QdrantService:
        """
        Create a QdrantService instance with async client.

        Args:
            config: ConfigurationService or QdrantConfig.

        Returns:
            Initialized QdrantService instance with async client.
        """
        return await QdrantService.create_async(config)

    @staticmethod
    async def create_vector_db_service(
        service_type: str,
        config: Union["ConfigurationService", QdrantConfig],
        is_async: bool = True,
    ) -> IVectorDBService:
        """
        Create a vector database service based on the service type.

        Args:
            service_type: Type of service to create ('qdrant', etc.).
            config: ConfigurationService or QdrantConfig.
            is_async: Whether to use async client (default: True).

        Returns:
            Initialized vector database service instance.

        Raises:
            ValueError: If service_type is not supported.
        """
        if service_type.lower() == "qdrant":
            if is_async:
                return await VectorDBFactory.create_qdrant_service_async(config)
            else:
                return await VectorDBFactory.create_qdrant_service_sync(config)
        else:
            logger.error(f"Unsupported vector database service type: {service_type}")
            raise ValueError(
                f"Unsupported vector database service type: {service_type}"
            )

