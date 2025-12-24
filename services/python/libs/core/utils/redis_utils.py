"""
Redis Utilities - Helper functions for Redis connections.

This module provides utility functions for building Redis connection URLs
and other Redis-related operations.

Usage:
    from libs.core.utils import build_redis_url

    redis_url = build_redis_url({"host": "localhost", "port": 6379})
"""

import os
from typing import Any, Dict, Optional

from libs.core.constants import RedisConfig


def _resolve_redis_password(config_password: Optional[str]) -> Optional[str]:
    """
    Resolve Redis password with environment variable override.

    Priority:
    1. REDIS_PASSWORD env var (if set, even if empty)
    2. Config from ETCD

    Set REDIS_PASSWORD= (empty) to disable auth for local development.

    Returns None for empty values to disable auth.
    """
    env_password = os.environ.get("REDIS_PASSWORD")
    if env_password is not None:
        # Env var is set - use it (empty string = no auth)
        return env_password if env_password.strip() else None

    # Fall back to config
    return config_password if config_password and config_password.strip() else None


def build_redis_url(
    redis_config: Dict[str, Any],
    default_db: int = RedisConfig.DEFAULT_DB.value,
) -> str:
    """
    Build a Redis connection URL from a configuration dictionary.

    Constructs a properly formatted Redis URL that can be used with
    redis-py or aioredis connection methods.

    Password resolution priority:
    1. REDIS_PASSWORD env var (if set, even if empty - allows disabling auth)
    2. password field from redis_config (typically from ETCD)

    Args:
        redis_config: Dictionary containing Redis connection parameters:
            - host: Redis server hostname (default: "localhost")
            - port: Redis server port (default: 6379)
            - password: Optional authentication password
            - db: Database number (default: 0)
        default_db: Default database number if not specified in config.

    Returns:
        Redis connection URL in format:
        - With password: "redis://:password@host:port/db"
        - Without password: "redis://host:port/db"

    Example:
        >>> config = {"host": "redis.example.com", "port": 6379, "password": "secret"}
        >>> url = build_redis_url(config)
        >>> print(url)
        "redis://:secret@redis.example.com:6379/0"

        >>> config = {"host": "localhost"}
        >>> url = build_redis_url(config)
        >>> print(url)
        "redis://localhost:6379/0"
    """
    host: str = redis_config.get("host", "localhost")
    port: int = redis_config.get("port", 6379)
    db: int = redis_config.get("db", default_db)

    # Resolve password with env var override
    password: Optional[str] = _resolve_redis_password(redis_config.get("password"))

    # Build URL with or without password
    if password:
        return f"redis://:{password}@{host}:{port}/{db}"

    return f"redis://{host}:{port}/{db}"

