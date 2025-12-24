"""
Dead Letter Queue (DLQ) - Handle poison messages gracefully.

This module provides a Dead Letter Queue implementation for handling
messages that fail processing repeatedly. Instead of blocking the main
queue or crashing the service, failed messages are moved to a DLQ for
later analysis and retry.

Features:
    - Configurable retry attempts before DLQ
    - Message metadata preservation
    - Error tracking and logging
    - Async producer integration

Usage:
    from libs.core.resilience import DeadLetterQueue

    dlq = DeadLetterQueue(
        producer=kafka_producer,
        dlq_topic="indexing-dlq",
        max_retries=3
    )

    try:
        await process_message(message)
    except Exception as e:
        await dlq.send_to_dlq(message, e)
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional, Protocol


class MessageProducer(Protocol):
    """Protocol for message producers."""

    async def send_message(
        self,
        topic: str,
        message: Dict[str, Any],
        key: Optional[str] = None,
    ) -> bool:
        """Send a message to a topic."""
        ...


@dataclass
class DLQMessage:
    """
    Represents a message in the Dead Letter Queue.

    Attributes:
        original_topic: The topic the message was originally consumed from.
        original_message: The original message payload.
        error_message: Description of the error that caused DLQ routing.
        error_type: Type/class name of the exception.
        retry_count: Number of processing attempts before DLQ.
        timestamp: When the message was sent to DLQ.
        metadata: Additional context about the failure.

    Example:
        >>> dlq_msg = DLQMessage(
        ...     original_topic="record-events",
        ...     original_message={"recordId": "123"},
        ...     error_message="Connection timeout",
        ...     error_type="TimeoutError",
        ...     retry_count=3
        ... )
    """

    original_topic: str
    original_message: Dict[str, Any]
    error_message: str
    error_type: str
    retry_count: int = 0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "originalTopic": self.original_topic,
            "originalMessage": self.original_message,
            "errorMessage": self.error_message,
            "errorType": self.error_type,
            "retryCount": self.retry_count,
            "timestamp": self.timestamp,
            "metadata": self.metadata,
        }


class DeadLetterQueue:
    """
    Dead Letter Queue handler for failed messages.

    This class provides a mechanism to route messages that fail processing
    to a separate topic (DLQ) for later analysis and potential retry.

    Attributes:
        producer: Message producer for sending to DLQ topic.
        dlq_topic: Name of the DLQ topic.
        max_retries: Maximum retries before sending to DLQ.
        logger: Logger instance for error reporting.

    Example:
        >>> dlq = DeadLetterQueue(
        ...     producer=kafka_producer,
        ...     dlq_topic="indexing-dlq",
        ...     max_retries=3,
        ...     logger=logger
        ... )
        >>>
        >>> async def process_with_dlq(message):
        ...     try:
        ...         await process(message)
        ...     except Exception as e:
        ...         if dlq.should_send_to_dlq(message):
        ...             await dlq.send_to_dlq(message, e, "record-events")
        ...         else:
        ...             raise  # Let it retry
    """

    def __init__(
        self,
        producer: MessageProducer,
        dlq_topic: str,
        max_retries: int = 3,
        logger: Optional[logging.Logger] = None,
    ) -> None:
        """
        Initialize the Dead Letter Queue handler.

        Args:
            producer: Message producer for sending to DLQ.
            dlq_topic: Name of the DLQ topic.
            max_retries: Maximum retries before DLQ routing.
            logger: Optional logger for error reporting.
        """
        self.producer = producer
        self.dlq_topic = dlq_topic
        self.max_retries = max_retries
        self.logger = logger or logging.getLogger(__name__)
        self._retry_counts: Dict[str, int] = {}

    def get_message_key(self, message: Dict[str, Any]) -> str:
        """
        Generate a unique key for tracking message retry counts.

        Args:
            message: The message to generate a key for.

        Returns:
            Unique string key for the message.
        """
        # Try common ID fields
        for key in ["recordId", "id", "_key", "messageId"]:
            if key in message:
                return str(message[key])

        # Fall back to hash of message content
        import hashlib
        import json

        content = json.dumps(message, sort_keys=True)
        return hashlib.md5(content.encode()).hexdigest()

    def increment_retry_count(self, message: Dict[str, Any]) -> int:
        """
        Increment and return the retry count for a message.

        Args:
            message: The message being retried.

        Returns:
            Current retry count after increment.
        """
        key = self.get_message_key(message)
        self._retry_counts[key] = self._retry_counts.get(key, 0) + 1
        return self._retry_counts[key]

    def get_retry_count(self, message: Dict[str, Any]) -> int:
        """
        Get the current retry count for a message.

        Args:
            message: The message to check.

        Returns:
            Current retry count (0 if never retried).
        """
        key = self.get_message_key(message)
        return self._retry_counts.get(key, 0)

    def should_send_to_dlq(self, message: Dict[str, Any]) -> bool:
        """
        Check if a message should be sent to the DLQ.

        Args:
            message: The message to check.

        Returns:
            True if retry count exceeds max_retries.
        """
        return self.get_retry_count(message) >= self.max_retries

    def clear_retry_count(self, message: Dict[str, Any]) -> None:
        """
        Clear the retry count for a successfully processed message.

        Args:
            message: The message that was successfully processed.
        """
        key = self.get_message_key(message)
        self._retry_counts.pop(key, None)

    async def send_to_dlq(
        self,
        message: Dict[str, Any],
        error: Exception,
        original_topic: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Send a failed message to the Dead Letter Queue.

        Args:
            message: The original message that failed processing.
            error: The exception that caused the failure.
            original_topic: The topic the message was consumed from.
            metadata: Optional additional context about the failure.

        Returns:
            True if the message was sent to DLQ successfully.

        Example:
            >>> try:
            ...     await process_record(record_message)
            ... except Exception as e:
            ...     await dlq.send_to_dlq(
            ...         message=record_message,
            ...         error=e,
            ...         original_topic="record-events",
            ...         metadata={"processor": "indexing"}
            ...     )
        """
        try:
            retry_count = self.get_retry_count(message)

            dlq_message = DLQMessage(
                original_topic=original_topic,
                original_message=message,
                error_message=str(error),
                error_type=type(error).__name__,
                retry_count=retry_count,
                metadata=metadata or {},
            )

            # Extract key for partitioning
            message_key = self.get_message_key(message)

            success = await self.producer.send_message(
                topic=self.dlq_topic,
                message=dlq_message.to_dict(),
                key=message_key,
            )

            if success:
                self.logger.warning(
                    f"☠️ Message sent to DLQ '{self.dlq_topic}': "
                    f"key={message_key}, error={type(error).__name__}, "
                    f"retries={retry_count}"
                )
                # Clear retry count after successful DLQ routing
                self.clear_retry_count(message)
            else:
                self.logger.error(
                    f"❌ Failed to send message to DLQ: key={message_key}"
                )

            return success

        except Exception as dlq_error:
            self.logger.error(
                f"❌ Error sending to DLQ: {str(dlq_error)}",
                exc_info=True,
            )
            return False

    async def handle_with_dlq(
        self,
        message: Dict[str, Any],
        handler: Any,  # Callable that processes the message
        original_topic: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Process a message with automatic DLQ routing on failure.

        This method wraps message processing with retry tracking and
        automatic DLQ routing when max retries are exceeded.

        Args:
            message: The message to process.
            handler: Async function to process the message.
            original_topic: The topic the message was consumed from.
            metadata: Optional additional context.

        Returns:
            True if processing succeeded, False if sent to DLQ.

        Example:
            >>> async def process_record(msg):
            ...     # Processing logic
            ...     pass
            >>>
            >>> success = await dlq.handle_with_dlq(
            ...     message=record_message,
            ...     handler=process_record,
            ...     original_topic="record-events"
            ... )
        """
        try:
            result = await handler(message)
            # Clear retry count on success
            self.clear_retry_count(message)
            return result

        except Exception as e:
            # Increment retry count
            retry_count = self.increment_retry_count(message)

            self.logger.warning(
                f"⚠️ Processing failed (attempt {retry_count}/{self.max_retries}): "
                f"{type(e).__name__}: {str(e)}"
            )

            # Check if we should send to DLQ
            if retry_count >= self.max_retries:
                await self.send_to_dlq(
                    message=message,
                    error=e,
                    original_topic=original_topic,
                    metadata=metadata,
                )
                return False
            else:
                # Re-raise to trigger retry
                raise

