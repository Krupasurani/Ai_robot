"""
Kafka Consumer - Apache Kafka implementation of IMessagingConsumer.

This module provides a Kafka consumer with support for concurrent
message processing, rate limiting, and automatic offset management.

Usage:
    from libs.messaging import KafkaMessagingConsumer, KafkaConsumerConfig

    config = KafkaConsumerConfig(
        topics=["my-topic"],
        client_id="my-consumer",
        group_id="my-group",
        bootstrap_servers=["localhost:9092"]
    )
    consumer = KafkaMessagingConsumer(logger, config)
    await consumer.start(message_handler)
"""

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Dict, List, Optional, Set

from aiokafka import AIOKafkaConsumer, TopicPartition  # type: ignore

from libs.messaging.interface.consumer import IMessagingConsumer
from libs.messaging.kafka.config import KafkaConsumerConfig
from libs.messaging.kafka.rate_limiter import RateLimiter

# Default concurrency settings
DEFAULT_MAX_CONCURRENT_TASKS = 5
DEFAULT_RATE_LIMIT_PER_SECOND = 2


class KafkaMessagingConsumer(IMessagingConsumer):
    """
    Kafka implementation of the IMessagingConsumer interface.

    This consumer supports:
        - Concurrent message processing with semaphore control.
        - Rate limiting to prevent downstream overload.
        - Automatic offset management with manual commits.
        - Graceful shutdown with task cleanup.

    Attributes:
        logger: Logger instance for debugging.
        kafka_config: Kafka consumer configuration.
        rate_limiter: Optional rate limiter for processing.
        max_concurrent_tasks: Maximum concurrent message handlers.

    Example:
        >>> config = KafkaConsumerConfig(
        ...     topics=["record-events"],
        ...     client_id="indexing-consumer",
        ...     group_id="indexing-group",
        ...     bootstrap_servers=["localhost:9092"]
        ... )
        >>> consumer = KafkaMessagingConsumer(logger, config)
        >>> await consumer.start(handle_record_event)
    """

    def __init__(
        self,
        logger: logging.Logger,
        kafka_config: KafkaConsumerConfig,
        rate_limiter: Optional[RateLimiter] = None,
        max_concurrent_tasks: int = DEFAULT_MAX_CONCURRENT_TASKS,
    ) -> None:
        """
        Initialize the Kafka consumer.

        Args:
            logger: Logger instance for debugging and error reporting.
            kafka_config: Kafka consumer configuration.
            rate_limiter: Optional rate limiter for message processing.
            max_concurrent_tasks: Maximum number of concurrent handlers.
        """
        self.logger = logger
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.running = False
        self.kafka_config = kafka_config
        self.processed_messages: Dict[str, List[int]] = {}
        self.consume_task: Optional[asyncio.Task] = None
        self.semaphore = asyncio.Semaphore(max_concurrent_tasks)
        self.message_handler: Optional[
            Callable[[Dict[str, Any]], Awaitable[bool]]
        ] = None
        self.rate_limiter = rate_limiter
        self.active_tasks: Set[asyncio.Task] = set()
        self.max_concurrent_tasks = max_concurrent_tasks

    @staticmethod
    def kafka_config_to_dict(kafka_config: KafkaConsumerConfig) -> Dict[str, Any]:
        """
        Convert KafkaConsumerConfig to dictionary for aiokafka.

        Args:
            kafka_config: Configuration dataclass.

        Returns:
            Dictionary suitable for AIOKafkaConsumer initialization.
        """
        return {
            "bootstrap_servers": ",".join(kafka_config.bootstrap_servers),
            "group_id": kafka_config.group_id,
            "auto_offset_reset": kafka_config.auto_offset_reset,
            "enable_auto_commit": kafka_config.enable_auto_commit,
            "client_id": kafka_config.client_id,
            "topics": kafka_config.topics,
        }

    async def initialize(self) -> None:
        """
        Initialize the Kafka consumer connection.

        Raises:
            ValueError: If configuration is invalid.
            ConnectionError: If connection to Kafka fails.
        """
        try:
            if not self.kafka_config:
                raise ValueError("Kafka configuration is not valid")

            kafka_dict = self.kafka_config_to_dict(self.kafka_config)
            topics = kafka_dict.pop("topics")

            self.consumer = AIOKafkaConsumer(*topics, **kafka_dict)
            await self.consumer.start()
            self.logger.info("✅ Kafka consumer initialized successfully")

        except Exception as e:
            self.logger.error(f"❌ Failed to create consumer: {e}")
            raise

    async def cleanup(self) -> None:
        """Stop the Kafka consumer and clean up resources."""
        try:
            if self.consumer:
                await self.consumer.stop()
                self.logger.info("✅ Kafka consumer stopped")
        except Exception as e:
            self.logger.error(f"❌ Error during cleanup: {e}")

    async def start(
        self,
        message_handler: Callable[[Dict[str, Any]], Awaitable[bool]],
    ) -> None:
        """
        Start consuming messages with the provided handler.

        Args:
            message_handler: Async function to process each message.
                            Should return True on success, False on failure.

        Raises:
            RuntimeError: If consumer fails to start.
        """
        try:
            self.running = True
            self.message_handler = message_handler

            if not self.consumer:
                await self.initialize()

            self.consume_task = asyncio.create_task(self._consume_loop())
            self.logger.info("✅ Started Kafka consumer task")

        except Exception as e:
            self.logger.error(f"❌ Failed to start Kafka consumer: {str(e)}")
            raise

    async def stop(
        self,
        message_handler: Optional[
            Callable[[Dict[str, Any]], Awaitable[bool]]
        ] = None,
    ) -> None:
        """
        Stop consuming messages gracefully.

        Args:
            message_handler: Optional handler to notify of shutdown.
        """
        self.running = False

        # Notify handler of shutdown
        if self.message_handler:
            try:
                await self.message_handler(None)  # type: ignore
            except Exception:
                pass

        # Cancel consume task
        if self.consume_task:
            self.consume_task.cancel()
            try:
                await self.consume_task
            except asyncio.CancelledError:
                pass

        # Stop consumer
        if self.consumer:
            await self.consumer.stop()
            self.logger.info("✅ Kafka consumer stopped")

    def is_running(self) -> bool:
        """Check if consumer is currently running."""
        return self.running

    async def _process_message(self, message: Any) -> bool:
        """
        Process a single Kafka message.

        Args:
            message: Raw Kafka message from aiokafka.

        Returns:
            True if processing succeeded, False otherwise.
        """
        message_id = None
        try:
            message_id = f"{message.topic}-{message.partition}-{message.offset}"
            self.logger.debug(f"Processing message {message_id}")

            # Check for duplicate processing
            if self._is_message_processed(message_id):
                self.logger.info(f"Message {message_id} already processed, skipping")
                return True

            # Decode message
            parsed_message = self._decode_message(message.value, message_id)
            if parsed_message is None:
                return False

            # Call handler
            if self.message_handler and parsed_message:
                try:
                    return await self.message_handler(parsed_message)
                except Exception as e:
                    self.logger.error(
                        f"Error in message handler for {message_id}: {str(e)}",
                        exc_info=True,
                    )
                    return False
            else:
                self.logger.error(f"No message handler available for {message_id}")
                return False

        except Exception as e:
            self.logger.error(
                f"Unexpected error processing message "
                f"{message_id if message_id else 'unknown'}: {str(e)}",
                exc_info=True,
            )
            return False
        finally:
            if message_id:
                self._mark_message_processed(message_id)

    def _decode_message(
        self,
        message_value: Any,
        message_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Decode and parse a Kafka message value.

        Args:
            message_value: Raw message value (bytes or string).
            message_id: Message identifier for logging.

        Returns:
            Parsed message as dictionary, or None on error.
        """
        try:
            if isinstance(message_value, bytes):
                message_value = message_value.decode("utf-8")

            if isinstance(message_value, str):
                try:
                    parsed = json.loads(message_value)
                    # Handle double-encoded JSON
                    if isinstance(parsed, str):
                        parsed = json.loads(parsed)
                    return parsed
                except json.JSONDecodeError as e:
                    self.logger.error(
                        f"JSON parsing failed for {message_id}: {str(e)}"
                    )
                    return None
            else:
                self.logger.error(
                    f"Unexpected message type for {message_id}: {type(message_value)}"
                )
                return None

        except UnicodeDecodeError as e:
            self.logger.error(f"Failed to decode message {message_id}: {str(e)}")
            return None

    async def _consume_loop(self) -> None:
        """Main message consumption loop."""
        try:
            self.logger.info("Starting Kafka consumer loop")
            while self.running:
                try:
                    message_batch = await self.consumer.getmany(  # type: ignore
                        timeout_ms=1000, max_records=1
                    )

                    if not message_batch:
                        await asyncio.sleep(0.1)
                        continue

                    for topic_partition, messages in message_batch.items():
                        for message in messages:
                            try:
                                self.logger.info(
                                    f"Received message: topic={message.topic}, "
                                    f"partition={message.partition}, "
                                    f"offset={message.offset}"
                                )

                                if self.rate_limiter:
                                    await self._start_processing_task(
                                        message, topic_partition
                                    )
                                else:
                                    success = await self._process_message(message)
                                    if success:
                                        await self.consumer.commit(  # type: ignore
                                            {topic_partition: message.offset + 1}
                                        )
                                        self.logger.info(
                                            f"Committed offset for "
                                            f"{message.topic}-{message.partition} "
                                            f"at offset {message.offset}"
                                        )
                                    else:
                                        self.logger.warning(
                                            f"Failed to process message at "
                                            f"offset {message.offset}"
                                        )

                            except Exception as e:
                                self.logger.error(
                                    f"Error processing individual message: {e}"
                                )
                                continue

                except asyncio.CancelledError:
                    self.logger.info("Kafka consumer task cancelled")
                    break
                except Exception as e:
                    self.logger.error(f"Error in consume loop: {e}")
                    await asyncio.sleep(1)

        except Exception as e:
            self.logger.error(f"Fatal error in consume loop: {e}")
        finally:
            await self.cleanup()

    def _is_message_processed(self, message_id: str) -> bool:
        """Check if a message has already been processed."""
        topic_partition = "-".join(message_id.split("-")[:-1])
        offset = int(message_id.split("-")[-1])
        return (
            topic_partition in self.processed_messages
            and offset in self.processed_messages[topic_partition]
        )

    def _mark_message_processed(self, message_id: str) -> None:
        """Mark a message as processed."""
        topic_partition = "-".join(message_id.split("-")[:-1])
        offset = int(message_id.split("-")[-1])
        if topic_partition not in self.processed_messages:
            self.processed_messages[topic_partition] = []
        self.processed_messages[topic_partition].append(offset)

    async def _start_processing_task(
        self,
        message: Any,
        topic_partition: TopicPartition,
    ) -> None:
        """Start a new task for processing a message with rate limiting."""
        if self.rate_limiter:
            await self.rate_limiter.wait()

        await self.semaphore.acquire()

        task = asyncio.create_task(
            self._process_message_wrapper(message, topic_partition)
        )
        self.active_tasks.add(task)
        self._cleanup_completed_tasks()

        self.logger.debug(
            f"Active tasks: {len(self.active_tasks)}/{self.max_concurrent_tasks}"
        )

    async def _process_message_wrapper(
        self,
        message: Any,
        topic_partition: TopicPartition,
    ) -> None:
        """Wrapper to handle task cleanup and semaphore release."""
        message_id = f"{message.topic}-{message.partition}-{message.offset}"
        try:
            success = await self._process_message(message)
            if success:
                if self.consumer:
                    await self.consumer.commit({topic_partition: message.offset + 1})
                    self.logger.info(f"Committed offset for {message_id}")
            else:
                self.logger.warning(
                    f"Processing failed for {message_id}, offset not committed"
                )
        except Exception as e:
            self.logger.error(f"Error in process wrapper for {message_id}: {e}")
        finally:
            self.semaphore.release()

    def _cleanup_completed_tasks(self) -> None:
        """Remove completed tasks from the active tasks set."""
        done_tasks = {task for task in self.active_tasks if task.done()}
        self.active_tasks -= done_tasks

        for task in done_tasks:
            if task.exception():
                self.logger.error(f"Task completed with exception: {task.exception()}")

