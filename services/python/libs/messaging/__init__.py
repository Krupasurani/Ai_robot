"""
Messaging Library - Kafka producer/consumer abstractions.

This module provides unified interfaces and implementations for message
broker operations, currently supporting Apache Kafka.

Components:
    - IMessagingConsumer: Abstract interface for message consumers.
    - IMessagingProducer: Abstract interface for message producers.
    - KafkaMessagingConsumer: Kafka implementation of consumer.
    - KafkaMessagingProducer: Kafka implementation of producer.
    - MessagingFactory: Factory for creating messaging instances.
    - RateLimiter: Rate limiting for message processing.

Usage:
    from libs.messaging import MessagingFactory, KafkaConsumerConfig

    config = KafkaConsumerConfig(
        topics=["my-topic"],
        client_id="my-consumer",
        group_id="my-group",
        bootstrap_servers=["localhost:9092"]
    )
    consumer = MessagingFactory.create_consumer(logger, config=config)
    await consumer.start(message_handler)
"""

from libs.messaging.factory import MessagingFactory
from libs.messaging.interface import IMessagingConsumer, IMessagingProducer
from libs.messaging.kafka.config import KafkaConsumerConfig, KafkaProducerConfig
from libs.messaging.kafka.consumer import KafkaMessagingConsumer
from libs.messaging.kafka.producer import KafkaMessagingProducer
from libs.messaging.kafka.rate_limiter import RateLimiter

__all__ = [
    # Interfaces
    "IMessagingConsumer",
    "IMessagingProducer",
    # Kafka implementations
    "KafkaMessagingConsumer",
    "KafkaMessagingProducer",
    "KafkaConsumerConfig",
    "KafkaProducerConfig",
    # Utilities
    "RateLimiter",
    "MessagingFactory",
]

