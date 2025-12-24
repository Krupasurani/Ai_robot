"""
Rate Limiter - Token bucket rate limiter for message processing.

This module provides a rate limiter to control the rate of message
processing, preventing overload of downstream services.

Usage:
    from libs.messaging import RateLimiter

    limiter = RateLimiter(rate=10)  # 10 operations per second
    await limiter.wait()  # Wait for token
    # Process message
"""

import asyncio
import time


class RateLimiter:
    """
    Token bucket rate limiter for controlling processing rate.

    This implementation uses the token bucket algorithm to limit
    the rate of operations. Tokens are added at a fixed rate, and
    each operation consumes one token.

    Attributes:
        rate: Maximum operations per second.
        tokens: Current number of available tokens.
        last_update: Timestamp of last token update.

    Example:
        >>> limiter = RateLimiter(rate=5)  # 5 ops/second
        >>> for message in messages:
        ...     await limiter.wait()
        ...     await process(message)
    """

    def __init__(self, rate: float) -> None:
        """
        Initialize the rate limiter.

        Args:
            rate: Maximum number of operations per second.
        """
        self.rate = rate
        self.tokens = rate  # Start with full bucket
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()

    async def wait(self) -> None:
        """
        Wait until a token is available.

        This method blocks until a token becomes available,
        then consumes one token.

        Example:
            >>> await limiter.wait()
            >>> # Token consumed, proceed with operation
        """
        async with self._lock:
            # Add tokens based on time elapsed
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.rate, self.tokens + elapsed * self.rate)
            self.last_update = now

            # Wait if no tokens available
            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

    def reset(self) -> None:
        """
        Reset the rate limiter to full capacity.

        This can be useful after a period of inactivity or
        when recovering from errors.
        """
        self.tokens = self.rate
        self.last_update = time.monotonic()

    @property
    def available_tokens(self) -> float:
        """
        Get the current number of available tokens.

        Returns:
            Number of tokens currently available.
        """
        now = time.monotonic()
        elapsed = now - self.last_update
        return min(self.rate, self.tokens + elapsed * self.rate)

