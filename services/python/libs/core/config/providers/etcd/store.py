"""
ETCD3 Distributed Key-Value Store - Raw ETCD3 implementation.

This module provides a distributed key-value store using ETCD3 as the backend,
with support for watching keys, TTL, and automatic reconnection.
"""

import asyncio
import json
from typing import Any, Callable, Generic, List, Optional, TypeVar

import etcd3

from libs.core.config.key_value_store import KeyValueStore
from libs.core.config.providers.etcd.connection_manager import (
    ConnectionConfig,
    Etcd3ConnectionManager,
)
from libs.core.logging import create_logger

logger = create_logger("etcd")

T = TypeVar("T")


class Etcd3DistributedKeyValueStore(KeyValueStore[T], Generic[T]):
    """
    ETCD3-based implementation of the distributed key-value store.

    This implementation provides a robust, distributed key-value store using ETCD3
    as the backend, with support for watching keys, TTL, and automatic reconnection.

    Attributes:
        connection_manager: Manages ETCD3 connection and reconnection.
        serializer: Function to convert values to bytes.
        deserializer: Function to convert bytes back to values.
    """

    def __init__(
        self,
        serializer: Callable[[T], bytes],
        deserializer: Callable[[bytes], T],
        host: str,
        port: int,
        timeout: float = 5.0,
        ca_cert: Optional[str] = None,
        cert_key: Optional[str] = None,
        cert_cert: Optional[str] = None,
    ) -> None:
        """
        Initialize the ETCD3 store.

        Args:
            serializer: Function to convert values to bytes.
            deserializer: Function to convert bytes back to values.
            host: ETCD server host.
            port: ETCD server port.
            timeout: Connection timeout in seconds.
            ca_cert: Optional CA certificate path for TLS.
            cert_key: Optional client key path for TLS.
            cert_cert: Optional client certificate path for TLS.
        """
        logger.debug("Initializing ETCD3 store: host=%s, port=%s", host, port)

        config = ConnectionConfig(
            hosts=[host],
            port=port,
            timeout=timeout,
            ca_cert=ca_cert,
            cert_key=cert_key,
            cert_cert=cert_cert,
        )
        self.client = None
        self.connection_manager = Etcd3ConnectionManager(config)
        self.serializer = serializer
        self.deserializer = deserializer
        self._active_watchers: List[Any] = []

        logger.debug("ETCD3 store initialized")

    async def _get_client(self) -> etcd3.client:
        """Get the ETCD client, ensuring connection is available."""
        client = await self.connection_manager.get_client()
        self.client = client
        return client

    async def create_key(
        self,
        key: str,
        value: T,
        overwrite: bool = True,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Create a new key in etcd.

        Args:
            key: The key to create.
            value: The value to store.
            overwrite: Whether to overwrite existing keys.
            ttl: Optional time-to-live in seconds.

        Returns:
            True if operation succeeded.

        Raises:
            ConnectionError: If ETCD is unavailable.
        """
        logger.debug("Creating key in ETCD: %s (ttl=%s)", key, ttl)

        try:
            client = await self._get_client()

            # Convert value to string if it's not already
            value_str = str(value) if not isinstance(value, str) else value

            # Check if key exists
            existing_value = await asyncio.to_thread(lambda: client.get(key))

            if existing_value[0] is not None and not overwrite:
                logger.debug("Key exists, skipping creation")
                return True
            elif existing_value[0] is not None:
                logger.debug("Key exists, updating value")
                success = await asyncio.to_thread(
                    lambda: client.put(key, value_str.encode())
                )
            else:
                logger.debug("Key doesn't exist, creating new")
                if ttl:
                    lease = await asyncio.to_thread(lambda: client.lease(ttl))
                    success = await asyncio.to_thread(
                        lambda: client.put(key, value_str.encode(), lease=lease)
                    )
                else:
                    success = await asyncio.to_thread(
                        lambda: client.put(key, value_str.encode())
                    )

            return success is not None

        except Exception as e:
            logger.error("Failed to create key %s: %s", key, str(e))
            raise ConnectionError(f"Failed to create key: {str(e)}")

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
            KeyError: If the key doesn't exist.
            ConnectionError: If ETCD is unavailable.
        """
        client = await self._get_client()

        # Check if key exists
        existing_value = await client.get(key)
        if existing_value[0] is None:
            raise KeyError(f'Key "{key}" does not exist.')

        # Create lease if TTL is specified
        lease = None
        if ttl is not None:
            lease = client.lease(ttl)

        # Update value with optional lease
        try:
            serialized_value = self.serializer(value)
            if lease:
                await client.put(key, serialized_value, lease=lease)
            else:
                await client.put(key, serialized_value)
        except Exception as e:
            if lease:
                await lease.revoke()
            raise ConnectionError(f"Failed to update key: {str(e)}")

    async def get_key(self, key: str) -> Optional[T]:
        """
        Get value for key from etcd.

        Args:
            key: The key to retrieve.

        Returns:
            The value, or None if not found.

        Raises:
            ConnectionError: If ETCD is unavailable.
        """
        logger.debug("Getting key from ETCD: %s", key)

        try:
            client = await self._get_client()
            result = await asyncio.to_thread(lambda: client.get(key))

            if result[0] is None:
                logger.debug("No value found for key")
                return None

            value_bytes = result[0]
            if not value_bytes:
                return None

            try:
                return self.deserializer(value_bytes)
            except json.JSONDecodeError as e:
                logger.error("Failed to deserialize value: %s", str(e))
                return None

        except Exception as e:
            logger.error("Failed to get key %s: %s", key, str(e))
            raise ConnectionError(f"Failed to get key: {str(e)}")

    async def delete_key(self, key: str) -> bool:
        """
        Delete a key from etcd.

        Args:
            key: The key to delete.

        Returns:
            True if deleted, False if not found.

        Raises:
            ConnectionError: If ETCD is unavailable.
        """
        client = await self._get_client()
        try:
            result = await client.delete(key)
            return result is not None
        except Exception as e:
            raise ConnectionError(f"Failed to delete key: {str(e)}")

    async def get_all_keys(self) -> List[str]:
        """
        Get all keys from etcd.

        Returns:
            List of all keys.

        Raises:
            ConnectionError: If ETCD is unavailable.
        """
        logger.debug("Getting all keys from ETCD")

        try:
            client = await self._get_client()
            keys = await asyncio.to_thread(lambda: list(client.get_all()))
            decoded_keys = [key[1].key.decode("utf-8") for key in keys]
            logger.debug("Found %d keys", len(decoded_keys))
            return decoded_keys
        except Exception as e:
            logger.error("Failed to get all keys: %s", str(e))
            raise ConnectionError(f"Failed to get all keys: {str(e)}")

    async def watch_key(
        self,
        key: str,
        callback: Callable[[Optional[T]], None],
        error_callback: Optional[Callable[[Exception], None]] = None,
    ) -> None:
        """
        Watch a key for changes.

        Args:
            key: The key to watch.
            callback: Function to call on value changes.
            error_callback: Optional function to call on errors.

        Returns:
            Watch ID for cancellation.

        Raises:
            ConnectionError: If watch setup fails.
        """
        logger.debug("Setting up watch for key: %s", key)
        client = await self._get_client()

        def watch_callback(event) -> None:
            try:
                if event.type == "PUT":
                    value = self.deserializer(event.value)
                    callback(value)
                elif event.type == "DELETE":
                    callback(None)
            except Exception as e:
                logger.error("Error in watch callback: %s", str(e))
                if error_callback:
                    error_callback(e)

        try:
            watch_id = await client.add_watch_callback(key, watch_callback)
            self._active_watchers.append(watch_id)
            logger.debug("Watch setup complete. ID: %s", watch_id)
            return watch_id
        except Exception as e:
            logger.error("Failed to setup watch: %s", str(e))
            raise ConnectionError(f"Failed to watch key: {str(e)}")

    async def list_keys_in_directory(self, directory: str) -> List[str]:
        """
        List all keys under a directory prefix.

        Args:
            directory: The directory prefix.

        Returns:
            List of keys under the directory.

        Raises:
            ConnectionError: If ETCD is unavailable.
        """
        client = await self._get_client()
        try:
            prefix = directory if directory.endswith("/") else f"{directory}/"
            return [key.decode("utf-8") for key, _ in await client.get_prefix(prefix)]
        except Exception as e:
            raise ConnectionError(f"Failed to list keys in directory: {str(e)}")

    async def cancel_watch(self, key: str, watch_id: str) -> None:
        """
        Cancel a watch operation.

        Args:
            key: The key being watched.
            watch_id: The watch ID to cancel.
        """
        client = await self._get_client()
        await client.cancel_watch(watch_id)

    async def close(self) -> None:
        """Clean up resources and close connection."""
        logger.debug("Closing ETCD3 store")

        for watch_id in self._active_watchers:
            try:
                client = await self.connection_manager.get_client()
                await client.cancel_watch(watch_id)
            except Exception as e:
                logger.warning("Failed to cancel watch %s: %s", watch_id, str(e))

        self._active_watchers.clear()
        await self.connection_manager.close()
        logger.debug("ETCD3 store closed")

