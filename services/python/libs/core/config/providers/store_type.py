"""
Store Type Enum - Defines supported key-value store backends.
"""

from enum import Enum, auto


class StoreType(Enum):
    """
    Enum defining supported key-value store types.

    Attributes:
        ETCD3: Distributed ETCD3 key-value store (production).
        IN_MEMORY: In-memory store (testing/development).
        ENVIRONMENT: Environment variable based store.
    """

    ETCD3 = auto()
    IN_MEMORY = auto()
    ENVIRONMENT = auto()

