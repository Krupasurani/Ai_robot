"""
Kafka Producer - Apache Kafka implementation of IMessagingProducer.

This module provides a Kafka producer with support for sending messages
and events with standardized formatting.

Usage:
    from libs.messaging import KafkaMessagingProducer, KafkaProducerConfig

    config = KafkaProducerConfig(
        bootstrap_servers=["localhost:9092"],
        client_id="my-producer"
    )
    producer = KafkaMessagingProducer(logger, config)
    await producer.initialize()
    await producer.send_event("my-topic", "NEW_RECORD", {"id": "123"})
"""

import json
import logging
from typing import Any, Dict, List, Optional

from aiokafka import AIOKafkaProducer  # type: ignore

from libs.core.utils import get_epoch_timestamp_in_ms
from libs.messaging.interface.producer import IMessagingProducer
from libs.messaging.kafka.config import KafkaProducerConfig


class KafkaMessagingProducer(IMessagingProducer):
    """
    Kafka implementation of the IMessagingProducer interface.

    This producer provides:
        - Async message sending with aiokafka.
        - Standardized event envelope format.
        - Automatic JSON serialization.
        - Connection management and cleanup.

    Attributes:
        logger: Logger instance for debugging.
        kafka_config: Kafka producer configuration.
        producer: Underlying aiokafka producer instance.

    Example:
        >>> config = KafkaProducerConfig(
        ...     bootstrap_servers=["localhost:9092"],
        ...     client_id="connector-producer"
        ... )
        >>> producer = KafkaMessagingProducer(logger, config)
        >>> await producer.initialize()
        >>> await producer.send_event(
        ...     topic="record-events",
        ...     event_type="NEW_RECORD",
        ...     payload={"recordId": "123", "orgId": "org_1"}
        ... )
    """

    def __init__(
        self,
        logger: logging.Logger,
        kafka_config: KafkaProducerConfig,
    ) -> None:
        """
        Initialize the Kafka producer.

        Args:
            logger: Logger instance for debugging and error reporting.
            kafka_config: Kafka producer configuration.
        """
        self.logger = logger
        self.producer: Optional[AIOKafkaProducer] = None
        self.kafka_config = kafka_config
        self.processed_messages: Dict[str, List[int]] = {}

    @staticmethod
    def kafka_config_to_dict(kafka_config: KafkaProducerConfig) -> Dict[str, Any]:
        """
        Convert KafkaProducerConfig to dictionary for aiokafka.

        Args:
            kafka_config: Configuration dataclass.

        Returns:
            Dictionary suitable for AIOKafkaProducer initialization.
        """
        return {
            "bootstrap_servers": ",".join(kafka_config.bootstrap_servers),
            "client_id": kafka_config.client_id,
        }

    async def initialize(self) -> None:
        """
        Initialize the Kafka producer connection.

        Raises:
            ValueError: If configuration is invalid.
            ConnectionError: If connection to Kafka fails.
        """
        try:
            if not self.kafka_config:
                raise ValueError("Kafka configuration is not valid")

            producer_config = self.kafka_config_to_dict(self.kafka_config)

            self.producer = AIOKafkaProducer(**producer_config)
            await self.producer.start()

            self.logger.info(
                f"✅ Kafka producer initialized with client_id: "
                f"{producer_config.get('client_id')}"
            )

        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Kafka producer: {str(e)}")
            raise

    async def cleanup(self) -> None:
        """Stop the Kafka producer and clean up resources."""
        if self.producer:
            try:
                await self.producer.stop()
                self.producer = None
                self.logger.info("✅ Kafka producer stopped successfully")
            except Exception as e:
                self.logger.error(f"❌ Error stopping Kafka producer: {str(e)}")

    async def start(self) -> None:
        """Start the Kafka producer (initializes if needed)."""
        if self.producer is None:
            await self.initialize()

    async def stop(self) -> None:
        """Stop the Kafka producer."""
        await self.cleanup()

    async def send_message(
        self,
        topic: str,
        message: Dict[str, Any],
        key: Optional[str] = None,
    ) -> bool:
        """
        Send a message to a Kafka topic.

        Args:
            topic: The Kafka topic to send to.
            message: The message payload as a dictionary.
            key: Optional message key for partitioning.

        Returns:
            True if the message was sent successfully, False otherwise.

        Example:
            >>> await producer.send_message(
            ...     topic="user-events",
            ...     message={"action": "login", "user_id": "123"},
            ...     key="user_123"
            ... )
        """
        try:
            if self.producer is None:
                await self.initialize()

            message_value = json.dumps(message).encode("utf-8")
            message_key = key.encode("utf-8") if key else None

            record_metadata = await self.producer.send_and_wait(  # type: ignore
                topic=topic,
                key=message_key,
                value=message_value,
            )

            self.logger.info(
                "✅ Message sent to %s [%s] at offset %s",
                record_metadata.topic,
                record_metadata.partition,
                record_metadata.offset,
            )

            return True

        except Exception as e:
            self.logger.error(f"❌ Failed to send message to Kafka: {str(e)}")
            return False

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
        containing:
            - eventType: The type of event
            - payload: The event data
            - timestamp: Unix timestamp in milliseconds

        Args:
            topic: The Kafka topic to send to.
            event_type: Type/name of the event (e.g., "NEW_RECORD").
            payload: The event payload data.
            key: Optional message key for partitioning.

        Returns:
            True if the event was sent successfully, False otherwise.

        Example:
            >>> await producer.send_event(
            ...     topic="record-events",
            ...     event_type="NEW_RECORD",
            ...     payload={"recordId": "123", "orgId": "org_1"},
            ...     key="record_123"
            ... )
        """
        try:
            message = {
                "eventType": event_type,
                "payload": payload,
                "timestamp": get_epoch_timestamp_in_ms(),
            }

            await self.send_message(topic=topic, message=message, key=key)

            self.logger.info(
                f"✅ Sent event '{event_type}' to topic '{topic}'"
            )
            return True

        except Exception as e:
            self.logger.error(f"❌ Error sending event: {str(e)}")
            return False

