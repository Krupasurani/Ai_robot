"""
Kafka Configuration - Configuration dataclasses for Kafka connections.

This module provides typed configuration structures for Kafka producers
and consumers.

Usage:
    from libs.messaging import KafkaConsumerConfig, KafkaProducerConfig

    consumer_config = KafkaConsumerConfig(
        topics=["my-topic"],
        client_id="my-consumer",
        group_id="my-group",
        bootstrap_servers=["localhost:9092"]
    )

    producer_config = KafkaProducerConfig(
        bootstrap_servers=["localhost:9092"],
        client_id="my-producer"
    )
"""

from dataclasses import dataclass, field
from typing import List


@dataclass
class KafkaProducerConfig:
    """
    Configuration for Kafka producers.

    Attributes:
        bootstrap_servers: List of Kafka broker addresses.
        client_id: Unique identifier for this producer.

    Example:
        >>> config = KafkaProducerConfig(
        ...     bootstrap_servers=["localhost:9092"],
        ...     client_id="indexing-producer"
        ... )
    """

    bootstrap_servers: List[str]
    client_id: str


@dataclass
class KafkaConsumerConfig:
    """
    Configuration for Kafka consumers.

    Attributes:
        topics: List of topics to subscribe to.
        client_id: Unique identifier for this consumer.
        group_id: Consumer group ID for load balancing.
        auto_offset_reset: Where to start reading ("earliest" or "latest").
        enable_auto_commit: Whether to auto-commit offsets.
        bootstrap_servers: List of Kafka broker addresses.

    Example:
        >>> config = KafkaConsumerConfig(
        ...     topics=["record-events"],
        ...     client_id="indexing-consumer",
        ...     group_id="indexing-group",
        ...     auto_offset_reset="earliest",
        ...     enable_auto_commit=False,
        ...     bootstrap_servers=["localhost:9092"]
        ... )
    """

    topics: List[str]
    client_id: str
    group_id: str
    auto_offset_reset: str = "earliest"
    enable_auto_commit: bool = False
    bootstrap_servers: List[str] = field(default_factory=list)

