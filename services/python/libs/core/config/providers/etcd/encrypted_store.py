"""
ETCD3 Encrypted Key-Value Store - Encrypted ETCD3 implementation.

This module provides an encrypted key-value store using ETCD3 as the backend.
All values are encrypted using AES-256-GCM before storage.
"""

import hashlib
import json
import os
from typing import Callable, Generic, List, Optional, TypeVar, Union

import dotenv
import etcd3

from libs.core.config.key_value_store import KeyValueStore
from libs.core.config.providers.etcd.store import Etcd3DistributedKeyValueStore
from libs.core.config.providers.factory import KeyValueStoreFactory, StoreConfig
from libs.core.config.providers.store_type import StoreType
from libs.core.constants import ConfigPath
from libs.core.encryption import EncryptionService
from libs.core.logging import create_logger

dotenv.load_dotenv()

logger = create_logger("etcd")

T = TypeVar("T")


class Etcd3EncryptedKeyValueStore(KeyValueStore[T], Generic[T]):
    """
    ETCD3-based implementation of the encrypted key-value store.

    This store encrypts all values using AES-256-GCM before storing them in ETCD.
    Certain keys (like endpoints and storage config) are stored unencrypted for
    bootstrapping purposes.

    Attributes:
        encryption_service: Service for encrypting/decrypting values.
        store: Underlying ETCD3 store.
    """

    # Keys that should NOT be encrypted (needed for bootstrapping)
    UNENCRYPTED_KEYS = [
        ConfigPath.ENDPOINTS.value,
        ConfigPath.STORAGE.value,
        ConfigPath.MIGRATIONS.value,
    ]

    def __init__(self, logger) -> None:
        """
        Initialize the encrypted ETCD3 store.

        Args:
            logger: Logger instance for this store.

        Raises:
            ValueError: If SECRET_KEY or ETCD_URL environment variables are missing.
        """
        self.logger = logger
        self.logger.debug("Initializing Etcd3EncryptedKeyValueStore")

        # Initialize encryption service
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            raise ValueError("SECRET_KEY environment variable is required")

        # Hash the secret key to get exactly 32 bytes for AES-256
        hashed_key = hashlib.sha256(secret_key.encode()).digest()
        hex_key = hashed_key.hex()

        self.encryption_service = EncryptionService.get_instance(
            "aes-256-gcm", hex_key, logger
        )
        self.logger.debug("Initialized EncryptionService")

        # Create underlying ETCD store
        self.store = self._create_store()
        self.logger.debug("KeyValueStore initialized successfully")

    @property
    def client(self) -> Optional[etcd3.client]:
        """Expose the underlying ETCD client for watchers and diagnostics."""
        return getattr(self.store, "client", None)

    def _create_store(self) -> Etcd3DistributedKeyValueStore:
        """
        Create the underlying ETCD store.

        Returns:
            Configured ETCD3 store instance.

        Raises:
            ValueError: If ETCD_URL is not configured.
        """
        self.logger.debug("Creating ETCD store configuration")

        etcd_url = os.getenv("ETCD_URL")
        if not etcd_url:
            raise ValueError("ETCD_URL environment variable is required")

        # Remove protocol if present
        if "://" in etcd_url:
            etcd_url = etcd_url.split("://")[1]

        # Split host and port
        parts = etcd_url.split(":")
        etcd_host = parts[0]
        etcd_port = int(parts[1])

        config = StoreConfig(
            host=etcd_host,
            port=etcd_port,
            timeout=float(os.getenv("ETCD_TIMEOUT", "5.0")),
            username=os.getenv("ETCD_USERNAME", None),
            password=os.getenv("ETCD_PASSWORD", None),
        )

        def serialize(value: Union[str, int, float, bool, dict, list, None]) -> bytes:
            """Serialize value to bytes."""
            if value is None:
                return b""
            if isinstance(value, (str, int, float, bool)):
                return json.dumps(value).encode("utf-8")
            return json.dumps(value, default=str).encode("utf-8")

        def deserialize(value: bytes) -> Union[str, int, float, bool, dict, list, None]:
            """Deserialize bytes to value."""
            if not value:
                return None
            try:
                decoded = value.decode("utf-8")
                try:
                    return json.loads(decoded)
                except json.JSONDecodeError:
                    return decoded
            except UnicodeDecodeError as e:
                self.logger.error("Failed to decode bytes: %s", str(e))
                return None

        store = KeyValueStoreFactory.create_store(
            store_type=StoreType.ETCD3,
            serializer=serialize,
            deserializer=deserialize,
            config=config,
        )
        self.logger.debug("ETCD store created successfully")
        return store

    def _should_encrypt(self, key: str) -> bool:
        """
        Determine if a key's value should be encrypted.

        Args:
            key: The key to check.

        Returns:
            True if the value should be encrypted.
        """
        return key not in self.UNENCRYPTED_KEYS

    async def create_key(
        self,
        key: str,
        value: T,
        overwrite: bool = True,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Create a new key in etcd with encrypted value.

        Args:
            key: The key to create.
            value: The value to store (will be encrypted).
            overwrite: Whether to overwrite existing keys.
            ttl: Optional time-to-live in seconds.

        Returns:
            True if operation succeeded.
        """
        try:
            # Check if key exists
            existing_value = await self.store.get_key(key)
            if existing_value is not None and not overwrite:
                self.logger.debug("Skipping existing key: %s", key)
                return True

            # Convert value to JSON string
            value_json = json.dumps(value)

            # Determine if encryption is needed
            encrypt_value = self._should_encrypt(key)
            if encrypt_value:
                # Encrypt the value
                encrypted_value = self.encryption_service.encrypt(value_json)
                stored_value = encrypted_value
            else:
                stored_value = value_json

            self.logger.debug("Storing key: %s (encrypted: %s)", key, encrypt_value)

            # Store the value
            success = await self.store.create_key(key, stored_value, overwrite, ttl)

            if success:
                # Verify the stored value
                encrypted_stored_value = await self.store.get_key(key)
                if encrypted_stored_value:
                    if encrypt_value:
                        processed_value = self.encryption_service.decrypt(
                            encrypted_stored_value
                        )
                    else:
                        processed_value = encrypted_stored_value
                    self.logger.debug("🔒 Processed value for key %s: %s", key, processed_value)
                    # Parse value if it's not already a dict (for unencrypted keys, it's already deserialized)
                    stored_value = json.loads(processed_value) if isinstance(processed_value, str) else processed_value
                    if stored_value != value:
                        self.logger.warning("⚠️ Verification failed for key: %s", key)
                self.logger.debug("Successfully stored key: %s", key)
                return True
            else:
                self.logger.error("Failed to store key: %s", key)
                return False

        except Exception as e:
            self.logger.error("Failed to store config value for key %s: %s", key, str(e))
            return False

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
            value: The new value (will be encrypted).
            ttl: Optional time-to-live in seconds.
        """
        return await self.create_key(key, value, True, ttl)

    async def get_key(self, key: str) -> Optional[T]:
        """
        Get and decrypt value for key from etcd.

        Args:
            key: The key to retrieve.

        Returns:
            The decrypted value, or None if not found.
        """
        try:
            encrypted_value = await self.store.get_key(key)

            if encrypted_value is not None:
                try:
                    UNENCRYPTED_KEYS = [
                        ConfigPath.ENDPOINTS.value,
                        ConfigPath.STORAGE.value,
                        ConfigPath.MIGRATIONS.value,
                    ]
                    needs_decryption = key not in UNENCRYPTED_KEYS
                    # Decrypt if needed
                    if needs_decryption:
                        value = self.encryption_service.decrypt(encrypted_value)
                    else:
                        value = encrypted_value

                    # Parse JSON if not already a dict
                    result = json.loads(value) if not isinstance(value, dict) else value
                    return result

                except Exception as e:
                    self.logger.error("Failed to process value for key %s: %s", key, str(e))
                    return None
            else:
                self.logger.debug("No value found in ETCD for key: %s", key)
                return None

        except Exception as e:
            self.logger.error("Failed to get config %s: %s", key, str(e))
            return None

    async def delete_key(self, key: str) -> bool:
        """
        Delete a key from etcd.

        Args:
            key: The key to delete.

        Returns:
            True if deleted.
        """
        return await self.store.delete_key(key)

    async def get_all_keys(self) -> List[str]:
        """
        Get all keys from etcd.

        Returns:
            List of all keys.
        """
        return await self.store.get_all_keys()

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
        """
        return await self.store.watch_key(key, callback, error_callback)

    async def list_keys_in_directory(self, directory: str) -> List[str]:
        """
        List all keys under a directory prefix.

        Args:
            directory: The directory prefix.

        Returns:
            List of keys under the directory.
        """
        return await self.store.list_keys_in_directory(directory)

    async def cancel_watch(self, key: str, watch_id: str) -> None:
        """
        Cancel a watch operation.

        Args:
            key: The key being watched.
            watch_id: The watch ID to cancel.
        """
        return await self.store.cancel_watch(key, watch_id)

    async def close(self) -> None:
        """Clean up resources and close connection."""
        self.store.close()

