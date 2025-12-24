"""
Key-Value Store Factory - Factory for creating key-value store instances.

This module provides a factory for creating different types of key-value stores
based on configuration.
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional, TypeVar

from libs.core.config.key_value_store import KeyValueStore
from libs.core.config.providers.store_type import StoreType
from libs.core.logging import create_logger

logger = create_logger("kv_factory")

T = TypeVar("T")


@dataclass
class StoreConfig:
    """
    Configuration for key-value store creation.

    Attributes:
        host: Store server hostname.
        port: Store server port.
        timeout: Connection timeout in seconds.
        username: Optional username for authentication.
        password: Optional password for authentication.
        ca_cert: Optional CA certificate path for TLS.
        cert_key: Optional client key path for TLS.
        cert_cert: Optional client certificate path for TLS.
        additional_options: Additional store-specific options.
    """

    host: str = "localhost"
    port: int = 2379
    timeout: float = 5.0
    username: Optional[str] = None
    password: Optional[str] = None
    ca_cert: Optional[str] = None
    cert_key: Optional[str] = None
    cert_cert: Optional[str] = None
    additional_options: Dict[str, Any] = field(default_factory=dict)


class KeyValueStoreFactory:
    """
    Factory class for creating different types of key-value stores.

    This factory handles the creation of different store implementations
    while managing their dependencies and configuration.
    """

    @staticmethod
    def create_store(
        store_type: StoreType,
        serializer: Optional[Callable[[T], bytes]] = None,
        deserializer: Optional[Callable[[bytes], T]] = None,
        config: Optional[StoreConfig] = None,
    ) -> KeyValueStore[T]:
        """
        Create a new key-value store instance.

        Args:
            store_type: Type of store to create.
            serializer: Function to convert values to bytes (required for ETCD3).
            deserializer: Function to convert bytes back to values (required for ETCD3).
            config: Optional configuration for the store.

        Returns:
            A new key-value store instance.

        Raises:
            ValueError: If required configuration is missing.
            TypeError: If serializer/deserializer types are incorrect.
        """
        logger.debug("Creating new key-value store: type=%s", store_type)

        config = config or StoreConfig()

        try:
            if store_type == StoreType.ETCD3:
                return KeyValueStoreFactory._create_etcd3_store(
                    serializer, deserializer, config
                )
            elif store_type == StoreType.IN_MEMORY:
                return KeyValueStoreFactory._create_in_memory_store()
            else:
                raise ValueError(f"Unsupported store type: {store_type}")

        except Exception as e:
            logger.error("Failed to create store: %s", str(e))
            raise ValueError(f"Failed to create store: {str(e)}") from e

    @staticmethod
    def _create_etcd3_store(
        serializer: Optional[Callable[[T], bytes]],
        deserializer: Optional[Callable[[bytes], T]],
        config: StoreConfig,
    ) -> "KeyValueStore[T]":
        """
        Create an ETCD3 store instance with validation.

        Args:
            serializer: Function to convert values to bytes.
            deserializer: Function to convert bytes back to values.
            config: Store configuration.

        Returns:
            ETCD3 store instance.

        Raises:
            ValueError: If serializer/deserializer are missing.
            TypeError: If serializer/deserializer are not callable.
        """
        # Import here to avoid circular imports
        from libs.core.config.providers.etcd.store import Etcd3DistributedKeyValueStore

        if not serializer or not deserializer:
            raise ValueError(
                "Serializer and deserializer functions must be provided for ETCD3 store."
            )

        if not callable(serializer) or not callable(deserializer):
            raise TypeError("Serializer and deserializer must be callable functions")

        logger.debug("Creating ETCD3 store: host=%s, port=%s", config.host, config.port)

        store = Etcd3DistributedKeyValueStore[T](
            serializer=serializer,
            deserializer=deserializer,
            host=config.host,
            port=config.port,
            timeout=config.timeout,
            ca_cert=config.ca_cert,
            cert_key=config.cert_key,
            cert_cert=config.cert_cert,
        )

        logger.debug("ETCD3 store created successfully")
        return store

    @staticmethod
    def _create_in_memory_store() -> "KeyValueStore[T]":
        """
        Create an in-memory store instance.

        Returns:
            In-memory store instance.
        """
        # Import here to avoid circular imports
        from libs.core.config.providers.in_memory_store import InMemoryKeyValueStore

        logger.debug("Creating in-memory store")
        store = InMemoryKeyValueStore[T]()
        logger.debug("In-memory store created successfully")
        return store

