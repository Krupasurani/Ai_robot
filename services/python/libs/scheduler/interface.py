"""
Scheduler Interface - Abstract interface for task schedulers.

This module defines the interface that all scheduler implementations must follow.
"""

from abc import ABC, abstractmethod
from typing import Any, List


class IScheduler(ABC):
    """
    Abstract interface for task schedulers.

    Implementations:
        - RedisScheduler: Redis-based scheduler with sorted sets.
        - Future: DatabaseScheduler, InMemoryScheduler, etc.
    """

    @abstractmethod
    async def schedule_event(self, event_data: dict) -> None:
        """
        Schedule an event for later processing.

        Args:
            event_data: Event data to schedule. Must contain payload.recordId.

        Raises:
            ValueError: If event_data is missing required fields.
        """
        pass

    @abstractmethod
    async def get_scheduled_events(self) -> List[dict]:
        """
        Get events that are ready for processing.

        Returns:
            List of event data dictionaries ready to be processed.
        """
        pass

    @abstractmethod
    async def remove_processed_event(self, event_data: dict) -> None:
        """
        Remove an event after processing.

        Args:
            event_data: Event data that was processed.
        """
        pass

    @abstractmethod
    async def process_scheduled_events(
        self,
        event_processor: Any,
    ) -> None:
        """
        Process scheduled events in a loop.

        This method runs continuously, checking for and processing
        events that are ready.

        Args:
            event_processor: Processor to handle each event.
        """
        pass

