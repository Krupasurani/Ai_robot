"""
Key-Value Store Interface - Abstract base class for distributed key-value stores.

This module defines the interface contract for key-value store implementations,
ensuring consistent behavior across different backends (ETCD, Redis, etc.).

Usage:
    from libs.core.config.key_value_store import KeyValueStore

    class MyCustomStore(KeyValueStore[dict]):
        async def get_key(self, key: str) -> Optional[dict]:
            # Implementation
            pass
"""

from abc import ABC, abstractmethod
from typing import Callable, Generic, List, Optional, TypeVar

T = TypeVar("T")


class KeyValueStore(ABC, Generic[T]):
    """
    Abstract base class defining the interface for distributed key-value stores.

    This interface provides a common contract for different key-value store
    implementations, ensuring consistent behavior across different backends
    like ETCD, Redis, or in-memory stores.

    Type Parameters:
        T: The type of values stored in the key-value store.

    Implementations:
        - Etcd3EncryptedKeyValueStore: ETCD with AES-256-GCM encryption.
        - InMemoryKeyValueStore: In-memory store for testing.

    Example:
        >>> class RedisKeyValueStore(KeyValueStore[str]):
        ...     async def get_key(self, key: str) -> Optional[str]:
        ...         return await self.redis.get(key)
    """

    @abstractmethod
    async def create_key(
        self,
        key: str,
        value: T,
        overwrite: bool = True,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Create a new key-value pair in the store.

        Args:
            key: The key to create (supports hierarchical paths like "/config/db").
            value: The value to associate with the key.
            overwrite: If True, overwrites existing key. If False, raises error.
            ttl: Optional time-to-live in seconds (key expires after this time).

        Raises:
            KeyError: If the key already exists and overwrite is False.
            ValueError: If the key or value is invalid.
            ConnectionError: If the store is unavailable.

        Example:
            >>> await store.create_key("/config/database", {"host": "localhost"})
            >>> await store.create_key("/cache/user/123", user_data, ttl=3600)
        """
        pass

    @abstractmethod
    async def update_value(
        self,
        key: str,
        value: T,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Update the value for an existing key.

        Args:
            key: The key to update.
            value: The new value.
            ttl: Optional time-to-live in seconds.

        Raises:
            KeyError: If the key doesn't exist.
            ValueError: If the value is invalid.
            ConnectionError: If the store is unavailable.

        Example:
            >>> await store.update_value("/config/database", {"host": "new-host"})
        """
        pass

    @abstractmethod
    async def get_key(self, key: str) -> Optional[T]:
        """
        Retrieve the value associated with a key.

        Args:
            key: The key to retrieve.

        Returns:
            The value associated with the key, or None if the key doesn't exist.

        Raises:
            ConnectionError: If the store is unavailable.

        Example:
            >>> config = await store.get_key("/config/database")
            >>> if config:
            ...     print(config["host"])
        """
        pass

    @abstractmethod
    async def delete_key(self, key: str) -> bool:
        """
        Delete a key-value pair from the store.

        Args:
            key: The key to delete.

        Returns:
            True if the key was deleted, False if it didn't exist.

        Raises:
            ConnectionError: If the store is unavailable.

        Example:
            >>> deleted = await store.delete_key("/cache/user/123")
            >>> print(f"Key {'deleted' if deleted else 'not found'}")
        """
        pass

    @abstractmethod
    async def get_all_keys(self) -> List[str]:
        """
        Retrieve all keys in the store.

        Returns:
            List of all keys in the store.

        Raises:
            ConnectionError: If the store is unavailable.

        Example:
            >>> keys = await store.get_all_keys()
            >>> print(f"Found {len(keys)} keys")
        """
        pass

    @abstractmethod
    async def watch_key(
        self,
        key: str,
        callback: Callable[[Optional[T]], None],
        error_callback: Optional[Callable[[Exception], None]] = None,
    ) -> int:
        """
        Watch a key for changes and execute callbacks when changes occur.

        This enables reactive configuration updates - when a value changes
        in the store, the callback is invoked with the new value.

        Args:
            key: The key to watch.
            callback: Function called when the value changes (receives new value).
            error_callback: Optional function called when errors occur.

        Returns:
            Watch identifier that can be used to cancel the watch.

        Raises:
            ConnectionError: If the store is unavailable.
            NotImplementedError: If watching is not supported by the backend.

        Example:
            >>> def on_config_change(new_value):
            ...     print(f"Config updated: {new_value}")
            >>> watch_id = await store.watch_key("/config/feature_flags", on_config_change)
        """
        pass

    @abstractmethod
    async def cancel_watch(self, key: str, watch_id: str) -> None:
        """
        Cancel a previously registered watch.

        Args:
            key: The key being watched.
            watch_id: The watch identifier returned by watch_key().

        Example:
            >>> await store.cancel_watch("/config/feature_flags", watch_id)
        """
        pass

    @abstractmethod
    async def list_keys_in_directory(self, directory: str) -> List[str]:
        """
        List all keys under a specific directory prefix.

        This is useful for hierarchical key structures where keys are
        organized in directories (e.g., "/config/services/").

        Args:
            directory: The directory prefix to search under.

        Returns:
            List of keys under the specified directory.

        Raises:
            ConnectionError: If the store is unavailable.

        Example:
            >>> keys = await store.list_keys_in_directory("/config/services/")
            >>> # Returns: ["/config/services/db", "/config/services/cache", ...]
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """
        Clean up resources and close connections.

        This method should be called when the store is no longer needed,
        typically during application shutdown.

        Example:
            >>> await store.close()
        """
        pass

