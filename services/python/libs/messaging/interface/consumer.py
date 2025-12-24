"""
Messaging Consumer Interface - Abstract base class for message consumers.

This module defines the contract for message consumer implementations,
supporting different message brokers (Kafka, RabbitMQ, etc.).

Usage:
    from libs.messaging import IMessagingConsumer

    class MyConsumer(IMessagingConsumer):
        async def start(self, message_handler):
            # Implementation
            pass
"""

from abc import ABC, abstractmethod
from typing import Any, Awaitable, Callable, Dict, Optional


class IMessagingConsumer(ABC):
    """
    Abstract interface for messaging consumers.

    This interface defines the contract for message consumer implementations,
    providing methods for lifecycle management and message consumption.

    Implementations:
        - KafkaMessagingConsumer: Apache Kafka implementation.

    Example:
        >>> class CustomConsumer(IMessagingConsumer):
        ...     async def start(self, handler):
        ...         while self.running:
        ...             message = await self.receive()
        ...             await handler(message)
    """

    @abstractmethod
    async def initialize(self) -> None:
        """
        Initialize the messaging consumer.

        This method should establish connections to the message broker
        and prepare the consumer for receiving messages.

        Raises:
            ConnectionError: If connection to broker fails.
            ValueError: If configuration is invalid.
        """
        pass

    @abstractmethod
    async def cleanup(self) -> None:
        """
        Clean up resources and close connections.

        This method should gracefully close all connections and
        release any resources held by the consumer.
        """
        pass

    @abstractmethod
    async def start(
        self,
        message_handler: Callable[[Dict[str, Any]], Awaitable[bool]],
    ) -> None:
        """
        Start consuming messages with the provided handler.

        This method begins the message consumption loop, calling the
        provided handler for each received message.

        Args:
            message_handler: Async function that processes messages.
                            Should return True if processing succeeded,
                            False otherwise.

        Example:
            >>> async def handle_message(message: dict) -> bool:
            ...     print(f"Received: {message}")
            ...     return True
            >>> await consumer.start(handle_message)
        """
        pass

    @abstractmethod
    async def stop(
        self,
        message_handler: Optional[Callable[[Dict[str, Any]], Awaitable[bool]]] = None,
    ) -> None:
        """
        Stop consuming messages.

        This method stops the consumption loop and optionally calls
        the message handler with None to signal shutdown.

        Args:
            message_handler: Optional handler to notify of shutdown.
        """
        pass

    @abstractmethod
    def is_running(self) -> bool:
        """
        Check if the consumer is currently running.

        Returns:
            True if the consumer is actively consuming messages.
        """
        pass

