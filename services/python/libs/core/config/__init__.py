"""
Configuration Submodule - Service configuration management.

This module provides configuration loading, validation, and caching
capabilities with support for multiple backends (ETCD, environment variables).

Components:
    - KeyValueStore: Abstract interface for key-value storage backends.
    - ConfigurationService: Main configuration management class.
    - Providers: ETCD and in-memory implementations.
"""

from libs.core.config.configuration_service import ConfigurationService
from libs.core.config.key_value_store import KeyValueStore
from libs.core.config.providers import (
    ConnectionConfig,
    ConnectionState,
    Etcd3ConnectionManager,
    Etcd3DistributedKeyValueStore,
    Etcd3EncryptedKeyValueStore,
    InMemoryKeyValueStore,
    KeyValueStoreFactory,
    StoreConfig,
    StoreType,
)

__all__ = [
    # Core interfaces
    "KeyValueStore",
    "ConfigurationService",
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

