"""
Retry Module - Automatic retry with exponential backoff.

This module provides retry decorators and utilities for handling transient
failures in external service calls, database connections, and network operations.

Features:
    - Exponential backoff with jitter
    - Configurable retry attempts
    - Exception filtering (retry only specific exceptions)
    - Async and sync support

Usage:
    from libs.core.resilience import retry_with_backoff, RetryConfig

    # Simple usage with decorator
    @retry_with_backoff(max_attempts=3)
    async def fetch_data():
        return await api.get()

    # With custom configuration
    config = RetryConfig(
        max_attempts=5,
        base_delay=1.0,
        max_delay=30.0,
        exponential_base=2.0
    )

    @retry_with_backoff(config=config)
    async def connect_database():
        return await db.connect()
"""

import asyncio
import functools
import logging
import random
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, Sequence, Type, TypeVar

# Try to import tenacity, fall back to custom implementation
try:
    from tenacity import (  # noqa: F401
        AsyncRetrying,
        RetryError,
        retry,
        retry_if_exception_type,
        stop_after_attempt,
        wait_exponential,
    )

    TENACITY_AVAILABLE = True
except ImportError:
    TENACITY_AVAILABLE = False

T = TypeVar("T")


@dataclass
class RetryConfig:
    """
    Configuration for retry behavior.

    Attributes:
        max_attempts: Maximum number of retry attempts (default: 3).
        base_delay: Initial delay between retries in seconds (default: 1.0).
        max_delay: Maximum delay between retries in seconds (default: 60.0).
        exponential_base: Base for exponential backoff (default: 2.0).
        jitter: Whether to add random jitter to delays (default: True).
        retry_exceptions: Exception types to retry on (default: all exceptions).
        on_retry: Optional callback called on each retry.

    Example:
        >>> config = RetryConfig(
        ...     max_attempts=5,
        ...     base_delay=0.5,
        ...     max_delay=30.0,
        ...     retry_exceptions=(ConnectionError, TimeoutError)
        ... )
    """

    max_attempts: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True
    retry_exceptions: Sequence[Type[Exception]] = field(
        default_factory=lambda: (Exception,)
    )
    on_retry: Optional[Callable[[Exception, int], None]] = None


def calculate_delay(
    attempt: int,
    base_delay: float,
    max_delay: float,
    exponential_base: float,
    jitter: bool,
) -> float:
    """
    Calculate delay for a retry attempt using exponential backoff.

    Args:
        attempt: Current attempt number (0-indexed).
        base_delay: Initial delay in seconds.
        max_delay: Maximum delay cap.
        exponential_base: Base for exponential calculation.
        jitter: Whether to add random jitter.

    Returns:
        Delay in seconds for this attempt.
    """
    delay = min(base_delay * (exponential_base**attempt), max_delay)

    if jitter:
        # Add up to 25% random jitter
        jitter_amount = delay * 0.25 * random.random()
        delay = delay + jitter_amount

    return delay


def retry_with_backoff(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    retry_exceptions: Optional[Sequence[Type[Exception]]] = None,
    config: Optional[RetryConfig] = None,
    logger: Optional[logging.Logger] = None,
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for automatic retry with exponential backoff.

    This decorator wraps functions to automatically retry on failure,
    using exponential backoff to avoid overwhelming failing services.

    Args:
        max_attempts: Maximum retry attempts.
        base_delay: Initial delay between retries.
        max_delay: Maximum delay cap.
        exponential_base: Base for exponential backoff.
        jitter: Whether to add random jitter.
        retry_exceptions: Exception types to retry on.
        config: Optional RetryConfig to use instead of individual params.
        logger: Optional logger for retry messages.

    Returns:
        Decorated function with retry behavior.

    Example:
        >>> @retry_with_backoff(max_attempts=3)
        ... async def fetch_data():
        ...     return await api.get()

        >>> @retry_with_backoff(
        ...     max_attempts=5,
        ...     retry_exceptions=(ConnectionError,)
        ... )
        ... def connect():
        ...     return db.connect()
    """
    # Use config if provided
    if config:
        max_attempts = config.max_attempts
        base_delay = config.base_delay
        max_delay = config.max_delay
        exponential_base = config.exponential_base
        jitter = config.jitter
        retry_exceptions = config.retry_exceptions

    if retry_exceptions is None:
        retry_exceptions = (Exception,)

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            last_exception: Optional[Exception] = None

            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e

                    if attempt < max_attempts - 1:
                        delay = calculate_delay(
                            attempt, base_delay, max_delay, exponential_base, jitter
                        )

                        if logger:
                            logger.warning(
                                f"Retry {attempt + 1}/{max_attempts} for "
                                f"{func.__name__} after {delay:.2f}s: {str(e)}"
                            )

                        await asyncio.sleep(delay)
                    else:
                        if logger:
                            logger.error(
                                f"All {max_attempts} retries exhausted for "
                                f"{func.__name__}: {str(e)}"
                            )

            # Re-raise the last exception
            if last_exception:
                raise last_exception
            raise RuntimeError("Unexpected retry state")

        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            import time

            last_exception: Optional[Exception] = None

            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e

                    if attempt < max_attempts - 1:
                        delay = calculate_delay(
                            attempt, base_delay, max_delay, exponential_base, jitter
                        )

                        if logger:
                            logger.warning(
                                f"Retry {attempt + 1}/{max_attempts} for "
                                f"{func.__name__} after {delay:.2f}s: {str(e)}"
                            )

                        time.sleep(delay)
                    else:
                        if logger:
                            logger.error(
                                f"All {max_attempts} retries exhausted for "
                                f"{func.__name__}: {str(e)}"
                            )

            if last_exception:
                raise last_exception
            raise RuntimeError("Unexpected retry state")

        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        else:
            return sync_wrapper  # type: ignore

    return decorator


async def retry_async(
    func: Callable[..., T],
    *args: Any,
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    retry_exceptions: Optional[Sequence[Type[Exception]]] = None,
    logger: Optional[logging.Logger] = None,
    **kwargs: Any,
) -> T:
    """
    Execute an async function with retry logic.

    This is a functional alternative to the decorator for cases where
    you need dynamic retry configuration.

    Args:
        func: Async function to execute.
        *args: Positional arguments for the function.
        max_attempts: Maximum retry attempts.
        base_delay: Initial delay between retries.
        max_delay: Maximum delay cap.
        retry_exceptions: Exception types to retry on.
        logger: Optional logger for retry messages.
        **kwargs: Keyword arguments for the function.

    Returns:
        Result of the function.

    Example:
        >>> result = await retry_async(
        ...     fetch_data,
        ...     url="https://api.example.com",
        ...     max_attempts=5
        ... )
    """
    if retry_exceptions is None:
        retry_exceptions = (Exception,)

    last_exception: Optional[Exception] = None

    for attempt in range(max_attempts):
        try:
            return await func(*args, **kwargs)
        except tuple(retry_exceptions) as e:
            last_exception = e

            if attempt < max_attempts - 1:
                delay = calculate_delay(attempt, base_delay, max_delay, 2.0, True)

                if logger:
                    logger.warning(
                        f"Retry {attempt + 1}/{max_attempts} after {delay:.2f}s: {str(e)}"
                    )

                await asyncio.sleep(delay)

    if last_exception:
        raise last_exception
    raise RuntimeError("Unexpected retry state")

