"""
Scheduler Factory - Factory for creating scheduler instances.

This module provides a factory for creating different types of schedulers
based on configuration.
"""

from logging import Logger
from typing import TYPE_CHECKING

from libs.scheduler.interface import IScheduler
from libs.scheduler.redis_scheduler import RedisScheduler

if TYPE_CHECKING:
    from libs.core.config import ConfigurationService


class SchedulerFactory:
    """
    Factory for creating scheduler instances.

    Usage:
        scheduler = SchedulerFactory.create_redis_scheduler(
            redis_url="redis://localhost:6379",
            logger=logger,
            config_service=config_service,
        )

        # Or use the generic factory method
        scheduler = SchedulerFactory.scheduler(
            scheduler_type="redis",
            url="redis://localhost:6379",
            logger=logger,
            config_service=config_service,
        )
    """

    @staticmethod
    def create_redis_scheduler(
        redis_url: str,
        logger: Logger,
        config_service: "ConfigurationService",
        delay_hours: int = 1,
    ) -> IScheduler:
        """
        Create a Redis-based scheduler instance.

        Args:
            redis_url: Redis connection URL.
            logger: Logger instance.
            config_service: Configuration service for JWT secrets.
            delay_hours: Delay in hours for scheduled events.

        Returns:
            RedisScheduler instance.
        """
        return RedisScheduler(
            redis_url=redis_url,
            logger=logger,
            config_service=config_service,
            delay_hours=delay_hours,
        )

    @staticmethod
    def scheduler(
        scheduler_type: str,
        url: str,
        logger: Logger,
        config_service: "ConfigurationService",
        delay_hours: int = 1,
    ) -> IScheduler:
        """
        Create a scheduler instance based on the type.

        Args:
            scheduler_type: Type of scheduler ("redis").
            url: Connection URL for the scheduler backend.
            logger: Logger instance.
            config_service: Configuration service.
            delay_hours: Delay in hours for scheduled events.

        Returns:
            Scheduler instance.

        Raises:
            ValueError: If scheduler_type is not supported.
        """
        if scheduler_type == "redis":
            return SchedulerFactory.create_redis_scheduler(
                url, logger=logger, config_service=config_service, delay_hours=delay_hours
            )
        else:
            raise ValueError(f"Invalid scheduler type: {scheduler_type}")

