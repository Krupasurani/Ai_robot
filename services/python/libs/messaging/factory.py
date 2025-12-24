"""
Messaging Factory - Factory for creating messaging service instances.

This module provides a factory pattern for creating message producers
and consumers, supporting different broker types.

Usage:
    from libs.messaging import MessagingFactory, KafkaConsumerConfig

    config = KafkaConsumerConfig(...)
    consumer = MessagingFactory.create_consumer(logger, config=config)
"""

import logging
from typing import Optional

from libs.messaging.interface.consumer import IMessagingConsumer
from libs.messaging.interface.producer import IMessagingProducer
from libs.messaging.kafka.config import KafkaConsumerConfig, KafkaProducerConfig
from libs.messaging.kafka.consumer import KafkaMessagingConsumer
from libs.messaging.kafka.producer import KafkaMessagingProducer
from libs.messaging.kafka.rate_limiter import RateLimiter


class MessagingFactory:
    """
    Factory for creating messaging service instances.

    This factory supports creating producers and consumers for different
    message broker types. Currently supports:
        - Apache Kafka

    Example:
        >>> # Create a Kafka producer
        >>> producer_config = KafkaProducerConfig(
        ...     bootstrap_servers=["localhost:9092"],
        ...     client_id="my-producer"
        ... )
        >>> producer = MessagingFactory.create_producer(
        ...     logger=logger,
        ...     config=producer_config
        ... )

        >>> # Create a Kafka consumer with rate limiting
        >>> consumer_config = KafkaConsumerConfig(
        ...     topics=["my-topic"],
        ...     client_id="my-consumer",
        ...     group_id="my-group",
        ...     bootstrap_servers=["localhost:9092"]
        ... )
        >>> rate_limiter = RateLimiter(rate=10)
        >>> consumer = MessagingFactory.create_consumer(
        ...     logger=logger,
        ...     config=consumer_config,
        ...     rate_limiter=rate_limiter
        ... )
    """

    @staticmethod
    def create_producer(
        logger: logging.Logger,
        config: Optional[KafkaProducerConfig] = None,
        broker_type: str = "kafka",
    ) -> IMessagingProducer:
        """
        Create a messaging producer instance.

        Args:
            logger: Logger instance for the producer.
            config: Producer configuration (required for Kafka).
            broker_type: Type of message broker ("kafka").

        Returns:
            IMessagingProducer implementation for the specified broker.

        Raises:
            ValueError: If config is missing or broker type is unsupported.

        Example:
            >>> config = KafkaProducerConfig(
            ...     bootstrap_servers=["localhost:9092"],
            ...     client_id="my-producer"
            ... )
            >>> producer = MessagingFactory.create_producer(logger, config)
        """
        if broker_type.lower() == "kafka":
            if config is None:
                raise ValueError("Kafka producer config is required")
            return KafkaMessagingProducer(logger, config)
        else:
            raise ValueError(f"Unsupported broker type: {broker_type}")

    @staticmethod
    def create_consumer(
        logger: logging.Logger,
        config: Optional[KafkaConsumerConfig] = None,
        rate_limiter: Optional[RateLimiter] = None,
        broker_type: str = "kafka",
    ) -> IMessagingConsumer:
        """
        Create a messaging consumer instance.

        Args:
            logger: Logger instance for the consumer.
            config: Consumer configuration (required for Kafka).
            rate_limiter: Optional rate limiter for message processing.
            broker_type: Type of message broker ("kafka").

        Returns:
            IMessagingConsumer implementation for the specified broker.

        Raises:
            ValueError: If config is missing or broker type is unsupported.

        Example:
            >>> config = KafkaConsumerConfig(
            ...     topics=["my-topic"],
            ...     client_id="my-consumer",
            ...     group_id="my-group",
            ...     bootstrap_servers=["localhost:9092"]
            ... )
            >>> consumer = MessagingFactory.create_consumer(logger, config)
        """
        if broker_type.lower() == "kafka":
            if config is None:
                raise ValueError("Kafka consumer config is required")
            return KafkaMessagingConsumer(logger, config, rate_limiter)
        else:
            raise ValueError(f"Unsupported broker type: {broker_type}")

