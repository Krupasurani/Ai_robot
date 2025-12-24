"""
In-Memory Key-Value Store - Testing and development implementation.

This module provides an in-memory key-value store for testing and development.
It implements the full KeyValueStore interface but is not distributed.
"""

import json
import time
from threading import Lock
from typing import Any, Callable, Dict, Generic, List, Optional, TypeVar

from libs.core.config.key_value_store import KeyValueStore
from libs.core.logging import create_logger

logger = create_logger("in_memory_store")

T = TypeVar("T")


class KeyData(Generic[T]):
    """
    Helper class to store value and TTL information.

    Attributes:
        value: The stored value.
        expiry: Optional expiration timestamp.
    """

    def __init__(self, value: T, ttl: Optional[int] = None) -> None:
        """
        Initialize key data with optional TTL.

        Args:
            value: The value to store.
            ttl: Optional time-to-live in seconds.
        """
        self.value = value
        self.expiry = time.time() + ttl if ttl else None

    def is_expired(self) -> bool:
        """
        Check if the value has expired.

        Returns:
            True if expired, False otherwise.
        """
        if not self.expiry:
            return False
        return time.time() > self.expiry


class InMemoryKeyValueStore(KeyValueStore[T], Generic[T]):
    """
    In-memory implementation of the distributed key-value store.

    This implementation is primarily used for testing and development.
    While it implements the full interface, it's not actually distributed
    and some features (like watching) are simulated.

    Attributes:
        store: Dictionary storing the key-value pairs.
        watchers: Dictionary storing active watchers for keys.
        lock: Thread-safe lock for concurrent access.
    """

    def __init__(
        self,
        logger=None,
        default_json_file_path: Optional[str] = None
    ) -> None:
        """
        Initialize an empty in-memory store.

        Args:
            logger: Optional logger instance.
            default_json_file_path: Optional path to JSON file for initial data.
        """
        self._logger = logger or globals()["logger"]
        self._logger.debug("Initializing InMemoryKeyValueStore")

        self.store: Dict[str, KeyData[T]] = {}
        self.watchers: Dict[str, List[tuple[Callable[[Optional[T]], None], Any]]] = {}
        self.lock = Lock()

        if default_json_file_path:
            self.json_file_path = default_json_file_path
            self.store = self._load_from_json(self.json_file_path)

        self._logger.debug("InMemoryKeyValueStore initialized")

    def _load_from_json(self, json_file_path: str) -> Dict[str, KeyData[T]]:
        """
        Load data from a JSON file.

        Args:
            json_file_path: Path to the JSON file.

        Returns:
            Dictionary of key-value pairs.
        """
        with open(json_file_path, 'r') as file:
            data = json.load(file)
        return {key: KeyData(value, None) for key, value in data.items()}

    def _cleanup_expired_keys(self) -> None:
        """Clean up expired keys synchronously."""
        expired_keys = [
            key for key, data in self.store.items() if data.is_expired()
        ]
        if expired_keys:
            for key in expired_keys:
                del self.store[key]
            self._logger.debug("Removed %d expired keys", len(expired_keys))

    def _notify_watchers(self, key: str, value: Optional[T]) -> None:
        """
        Notify all watchers of a key about value changes.

        Args:
            key: The key that changed.
            value: The new value (or None if deleted).
        """
        if key in self.watchers:
            for callback, watch_id in self.watchers[key]:
                try:
                    callback(value)
                except Exception as e:
                    self._logger.error("Error in watcher callback: %s", str(e))

    async def create_key(
        self,
        key: str,
        value: T,
        overwrite: bool = True,
        ttl: Optional[int] = None
    ) -> None:
        """
        Create a new key-value pair in the store.

        Args:
            key: The key to create.
            value: The value to associate with the key.
            overwrite: Whether to overwrite existing keys.
            ttl: Optional time-to-live in seconds.

        Raises:
            KeyError: If the key already exists and overwrite is False.
        """
        self._logger.debug("Creating key: %s (ttl=%s)", key, ttl)

        with self.lock:
            self._cleanup_expired_keys()
            if key in self.store and not self.store[key].is_expired() and not overwrite:
                raise KeyError(f'Key "{key}" already exists.')

            self.store[key] = KeyData(value, ttl)
            self._notify_watchers(key, value)

    async def update_value(
        self,
        key: str,
        value: T,
        ttl: Optional[int] = None
    ) -> None:
        """
        Update the value for an existing key.

        Args:
            key: The key to update.
            value: The new value.
            ttl: Optional time-to-live in seconds.

        Raises:
            KeyError: If the key doesn't exist or has expired.
        """
        with self.lock:
            self._cleanup_expired_keys()
            if key not in self.store or self.store[key].is_expired():
                raise KeyError(f'Key "{key}" does not exist.')

            self.store[key] = KeyData(value, ttl)
            self._notify_watchers(key, value)

    async def get_key(self, key: str) -> Optional[T]:
        """
        Retrieve the value associated with a key.

        Args:
            key: The key to retrieve.

        Returns:
            The value, or None if not found or expired.
        """
        with self.lock:
            self._cleanup_expired_keys()
            if key in self.store:
                data = self.store[key]
                if not data.is_expired():
                    return data.value
            return None

    async def delete_key(self, key: str) -> bool:
        """
        Delete a key-value pair from the store.

        Args:
            key: The key to delete.

        Returns:
            True if the key was deleted, False if it didn't exist.
        """
        with self.lock:
            self._cleanup_expired_keys()
            if key in self.store:
                del self.store[key]
                self._notify_watchers(key, None)
                return True
            return False

    async def get_all_keys(self) -> List[str]:
        """
        Retrieve all non-expired keys in the store.

        Returns:
            List of all valid keys.
        """
        with self.lock:
            self._cleanup_expired_keys()
            return [
                key for key, data in self.store.items()
                if not data.is_expired()
            ]

    async def watch_key(
        self,
        key: str,
        callback: Callable[[Optional[T]], None],
        error_callback: Optional[Callable[[Exception], None]] = None,
    ) -> int:
        """
        Watch a key for changes.

        Args:
            key: The key to watch.
            callback: Function to call when the value changes.
            error_callback: Optional function to call when errors occur.

        Returns:
            Watch identifier for cancellation.
        """
        watch_id = id(callback)

        with self.lock:
            if key not in self.watchers:
                self.watchers[key] = []
            self.watchers[key].append((callback, watch_id))

        return watch_id

    def cancel_watch(self, key: str, watch_id: str) -> None:
        """
        Cancel a watch operation.

        Args:
            key: The key being watched.
            watch_id: The watch identifier.
        """
        with self.lock:
            if key in self.watchers:
                self.watchers[key] = [
                    (cb, wid) for cb, wid in self.watchers[key]
                    if wid != watch_id
                ]
                if not self.watchers[key]:
                    del self.watchers[key]

    async def list_keys_in_directory(self, directory: str) -> List[str]:
        """
        List all non-expired keys under a directory prefix.

        Args:
            directory: The directory prefix.

        Returns:
            List of keys under the directory.
        """
        with self.lock:
            self._cleanup_expired_keys()
            return [
                key for key, data in self.store.items()
                if key.startswith(directory) and not data.is_expired()
            ]

    async def close(self) -> None:
        """Clean up resources."""
        with self.lock:
            self.store.clear()
            self.watchers.clear()

