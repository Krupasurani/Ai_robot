"""
Resilience Module - Fault tolerance patterns and utilities.

This module provides resilience patterns for building fault-tolerant services:
    - Retry: Automatic retry with exponential backoff using tenacity.
    - Circuit Breaker: Prevent cascading failures with pybreaker.
    - Dead Letter Queue: Handle poison messages gracefully.

Usage:
    from libs.core.resilience import retry_with_backoff, circuit_breaker

    @retry_with_backoff(max_attempts=3)
    async def fetch_data():
        return await external_api.get()

    @circuit_breaker(failure_threshold=5)
    async def call_service():
        return await service.call()
"""

from libs.core.resilience.dlq import DeadLetterQueue, DLQMessage
from libs.core.resilience.retry import (
    RetryConfig,
    retry_async,
    retry_with_backoff,
)

__all__ = [
    # Retry
    "retry_with_backoff",
    "retry_async",
    "RetryConfig",
    # Dead Letter Queue
    "DeadLetterQueue",
    "DLQMessage",
]

