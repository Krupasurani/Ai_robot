"""
Scheduler Library - Task scheduling and delayed event processing.

This module provides scheduling capabilities for delayed task execution,
currently supporting Redis-based scheduling.

Components:
    - IScheduler: Abstract interface for schedulers.
    - RedisScheduler: Redis-based scheduler implementation.
    - SchedulerFactory: Factory for creating scheduler instances.

Usage:
    from libs.scheduler import SchedulerFactory

    scheduler = SchedulerFactory.create_redis_scheduler(
        redis_url="redis://localhost:6379",
        logger=logger,
        config_service=config_service,
    )
    await scheduler.schedule_event(event_data)
"""

from libs.scheduler.factory import SchedulerFactory
from libs.scheduler.interface import IScheduler
from libs.scheduler.redis_scheduler import RedisScheduler

__all__ = [
    "IScheduler",
    "RedisScheduler",
    "SchedulerFactory",
]

