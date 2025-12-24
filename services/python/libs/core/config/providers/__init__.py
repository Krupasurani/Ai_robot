"""
Config Providers - Key-value store implementations.

This module provides different backend implementations for configuration storage:
    - Etcd3EncryptedKeyValueStore: Production ETCD3 store with encryption.
    - Etcd3DistributedKeyValueStore: Raw ETCD3 store without encryption.
    - InMemoryKeyValueStore: In-memory store for testing.
    - KeyValueStoreFactory: Factory for creating store instances.

Usage:
    from libs.core.config.providers import (
        Etcd3EncryptedKeyValueStore,
        KeyValueStoreFactory,
        StoreType,
    )

    # Create encrypted ETCD store (recommended for production)
    store = Etcd3EncryptedKeyValueStore(logger)

    # Or use factory for flexibility
    store = KeyValueStoreFactory.create_store(StoreType.ETCD3, ...)
"""

from libs.core.config.providers.etcd import (
    ConnectionConfig,
    ConnectionState,
    Etcd3ConnectionManager,
    Etcd3DistributedKeyValueStore,
    Etcd3EncryptedKeyValueStore,
)
from libs.core.config.providers.factory import KeyValueStoreFactory, StoreConfig
from libs.core.config.providers.in_memory_store import InMemoryKeyValueStore
from libs.core.config.providers.store_type import StoreType

__all__ = [
    # Store types
    "StoreType",
    # Implementations
    "Etcd3EncryptedKeyValueStore",
    "Etcd3DistributedKeyValueStore",
    "InMemoryKeyValueStore",
    # ETCD connection management
    "Etcd3ConnectionManager",
    "ConnectionConfig",
    "ConnectionState",
    # Factory
    "KeyValueStoreFactory",
    "StoreConfig",
]

