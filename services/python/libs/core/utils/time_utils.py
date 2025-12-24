"""
Time Utilities - Helper functions for time and timestamp operations.

This module provides utility functions for working with timestamps,
date conversions, and time-related operations.

Usage:
    from libs.core.utils import get_epoch_timestamp_in_ms

    timestamp = get_epoch_timestamp_in_ms()
"""

import time
from datetime import datetime, timezone
from typing import Optional


def get_epoch_timestamp_in_ms() -> int:
    """
    Get the current Unix epoch timestamp in milliseconds.

    Returns:
        Current timestamp as milliseconds since Unix epoch (January 1, 1970).

    Example:
        >>> timestamp = get_epoch_timestamp_in_ms()
        >>> print(timestamp)
        1705312800000
    """
    return int(time.time() * 1000)


def get_epoch_timestamp_in_seconds() -> int:
    """
    Get the current Unix epoch timestamp in seconds.

    Returns:
        Current timestamp as seconds since Unix epoch.

    Example:
        >>> timestamp = get_epoch_timestamp_in_seconds()
        >>> print(timestamp)
        1705312800
    """
    return int(time.time())


def datetime_to_epoch_ms(dt: datetime) -> int:
    """
    Convert a datetime object to Unix epoch timestamp in milliseconds.

    Args:
        dt: Datetime object to convert. If naive (no timezone), assumes UTC.

    Returns:
        Timestamp as milliseconds since Unix epoch.

    Example:
        >>> from datetime import datetime, timezone
        >>> dt = datetime(2024, 1, 15, 12, 0, 0, tzinfo=timezone.utc)
        >>> timestamp = datetime_to_epoch_ms(dt)
        >>> print(timestamp)
        1705320000000
    """
    # If datetime is naive, assume UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return int(dt.timestamp() * 1000)


def epoch_ms_to_datetime(timestamp_ms: int) -> datetime:
    """
    Convert Unix epoch timestamp in milliseconds to datetime object.

    Args:
        timestamp_ms: Timestamp in milliseconds since Unix epoch.

    Returns:
        Datetime object in UTC timezone.

    Example:
        >>> dt = epoch_ms_to_datetime(1705320000000)
        >>> print(dt)
        2024-01-15 12:00:00+00:00
    """
    return datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)


def format_timestamp(
    timestamp_ms: Optional[int] = None,
    format_str: str = "%Y-%m-%d %H:%M:%S",
) -> str:
    """
    Format a timestamp as a human-readable string.

    Args:
        timestamp_ms: Timestamp in milliseconds. If None, uses current time.
        format_str: strftime format string.

    Returns:
        Formatted timestamp string.

    Example:
        >>> formatted = format_timestamp(1705320000000)
        >>> print(formatted)
        "2024-01-15 12:00:00"
    """
    if timestamp_ms is None:
        timestamp_ms = get_epoch_timestamp_in_ms()

    dt = epoch_ms_to_datetime(timestamp_ms)
    return dt.strftime(format_str)


# Maximum length of timestamp in milliseconds (13 digits)
MAX_TIMESTAMP_LENGTH = 13


def parse_timestamp(timestamp_str: str) -> int:
    """
    Parse an ISO 8601 timestamp string to Unix epoch milliseconds.

    Args:
        timestamp_str: ISO 8601 formatted timestamp string.

    Returns:
        Timestamp in milliseconds since Unix epoch.

    Example:
        >>> ts = parse_timestamp("2024-01-15T12:00:00Z")
        >>> print(ts)
        1705320000000
    """
    # Remove the 'Z' and add '+00:00' for UTC
    if timestamp_str.endswith("Z") or timestamp_str.endswith("z"):
        timestamp_str = timestamp_str[:-1] + "+00:00"

    dt = datetime.fromisoformat(timestamp_str)
    timestamp = int(dt.timestamp())

    # Check if timestamp is already in milliseconds (13 digits)
    if len(str(timestamp)) >= MAX_TIMESTAMP_LENGTH:
        return timestamp

    # Convert seconds to milliseconds
    return timestamp * 1000


def prepare_iso_timestamps(start_time: str, end_time: str) -> tuple:
    """
    Convert start and end time strings to ISO 8601 formatted strings.

    Args:
        start_time: Start timestamp string.
        end_time: End timestamp string.

    Returns:
        Tuple of (start_iso, end_iso) formatted strings.

    Example:
        >>> start, end = prepare_iso_timestamps(
        ...     "2024-01-15T00:00:00Z",
        ...     "2024-01-16T00:00:00Z"
        ... )
    """
    start_timestamp = parse_timestamp(start_time)
    end_timestamp = parse_timestamp(end_time)

    start_dt = datetime.fromtimestamp(start_timestamp / 1000, tz=timezone.utc)
    end_dt = datetime.fromtimestamp(end_timestamp / 1000, tz=timezone.utc)

    return start_dt.isoformat(), end_dt.isoformat()


# ============================================================================
# Human-readable date/time formatting
# ============================================================================


def get_current_date() -> str:
    """
    Get the current date as a human-readable string.

    Returns:
        Current date in "Month DD, YYYY" format.

    Example:
        >>> date = get_current_date()
        >>> print(date)
        "January 15, 2024"
    """
    return datetime.now().strftime("%B %d, %Y")


def get_current_time() -> str:
    """
    Get the current time as a human-readable string.

    Returns:
        Current time in "HH:MM:SS" format.

    Example:
        >>> time = get_current_time()
        >>> print(time)
        "14:30:45"
    """
    return datetime.now().strftime("%H:%M:%S")


def get_current_datetime() -> str:
    """
    Get the current date and time as a human-readable string.

    Returns:
        Current datetime in "Month DD, YYYY HH:MM:SS" format.

    Example:
        >>> dt = get_current_datetime()
        >>> print(dt)
        "January 15, 2024 14:30:45"
    """
    return datetime.now().strftime("%B %d, %Y %H:%M:%S")


def get_current_datetime_with_timezone() -> str:
    """
    Get the current UTC date and time as a human-readable string.

    Returns:
        Current UTC datetime in "Month DD, YYYY HH:MM:SS" format.

    Example:
        >>> dt = get_current_datetime_with_timezone()
        >>> print(dt)
        "January 15, 2024 14:30:45"
    """
    return datetime.now(timezone.utc).strftime("%B %d, %Y %H:%M:%S")

