"""
ETCD Provider - ETCD3 key-value store implementations.

This module provides ETCD3-based key-value store implementations:
    - Etcd3EncryptedKeyValueStore: Encrypted store for sensitive data.
    - Etcd3DistributedKeyValueStore: Raw distributed store.
    - Etcd3ConnectionManager: Connection management with auto-reconnect.

Usage:
    from libs.core.config.providers.etcd import Etcd3EncryptedKeyValueStore

    store = Etcd3EncryptedKeyValueStore(logger)
    await store.create_key("/config/my-key", {"setting": "value"})
"""

from libs.core.config.providers.etcd.connection_manager import (
    ConnectionConfig,
    ConnectionState,
    Etcd3ConnectionManager,
)
from libs.core.config.providers.etcd.encrypted_store import Etcd3EncryptedKeyValueStore
from libs.core.config.providers.etcd.store import Etcd3DistributedKeyValueStore

__all__ = [
    "Etcd3EncryptedKeyValueStore",
    "Etcd3DistributedKeyValueStore",
    "Etcd3ConnectionManager",
    "ConnectionConfig",
    "ConnectionState",
]

