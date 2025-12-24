"""
Messaging Producer Interface - Abstract base class for message producers.

This module defines the contract for message producer implementations,
supporting different message brokers (Kafka, RabbitMQ, etc.).

Usage:
    from libs.messaging import IMessagingProducer

    class MyProducer(IMessagingProducer):
        async def send_message(self, topic, message, key=None):
            # Implementation
            pass
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional


class IMessagingProducer(ABC):
    """
    Abstract interface for messaging producers.

    This interface defines the contract for message producer implementations,
    providing methods for lifecycle management and message publishing.

    Implementations:
        - KafkaMessagingProducer: Apache Kafka implementation.

    Example:
        >>> class CustomProducer(IMessagingProducer):
        ...     async def send_message(self, topic, message, key=None):
        ...         await self.client.publish(topic, message)
        ...         return True
    """

    @abstractmethod
    async def initialize(self) -> None:
        """
        Initialize the messaging producer.

        This method should establish connections to the message broker
        and prepare the producer for sending messages.

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
        release any resources held by the producer.
        """
        pass

    @abstractmethod
    async def start(self) -> None:
        """
        Start the messaging producer.

        This method initializes the producer if not already done.
        """
        pass

    @abstractmethod
    async def stop(self) -> None:
        """
        Stop the messaging producer.

        This method stops the producer and releases resources.
        """
        pass

    @abstractmethod
    async def send_message(
        self,
        topic: str,
        message: Dict[str, Any],
        key: Optional[str] = None,
    ) -> bool:
        """
        Send a message to a topic.

        Args:
            topic: The topic/queue to send the message to.
            message: The message payload as a dictionary.
            key: Optional message key for partitioning.

        Returns:
            True if the message was sent successfully, False otherwise.

        Example:
            >>> success = await producer.send_message(
            ...     topic="user-events",
            ...     message={"action": "login", "user_id": "123"},
            ...     key="user_123"
            ... )
        """
        pass

    @abstractmethod
    async def send_event(
        self,
        topic: str,
        event_type: str,
        payload: Dict[str, Any],
        key: Optional[str] = None,
    ) -> bool:
        """
        Send an event message with standardized format.

        This method wraps the payload in a standard event envelope
        containing event type and timestamp.

        Args:
            topic: The topic to send the event to.
            event_type: Type/name of the event (e.g., "NEW_RECORD").
            payload: The event payload data.
            key: Optional message key for partitioning.

        Returns:
            True if the event was sent successfully, False otherwise.

        Example:
            >>> success = await producer.send_event(
            ...     topic="record-events",
            ...     event_type="NEW_RECORD",
            ...     payload={"recordId": "123", "orgId": "org_1"},
            ...     key="record_123"
            ... )
        """
        pass

