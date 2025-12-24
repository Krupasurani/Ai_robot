"""
Core Library - Shared utilities, configuration, and base classes.

This module provides foundational components used across all services:
    - Logging: Standardized logger creation with file and console output.
    - Configuration: Service configuration management with ETCD and env fallbacks.
    - Encryption: AES-256-GCM encryption service for sensitive data.
    - Exceptions: Common exception classes and error handling utilities.
    - Constants: Shared configuration constants and enums.
    - Utils: Common utility functions (Redis, time, etc.).
"""

from libs.core.config import (
    ConfigurationService,
    KeyValueStore,
)
from libs.core.constants import (
    AccountType,
    ArangoCollection,
    ConfigPath,
    ConnectorName,
    DefaultEndpoint,
    EventType,
    HttpStatusCode,
    KafkaClientId,
    ProgressStatus,
    RedisConfig,
    TokenScope,
)
from libs.core.encryption import (
    DecryptionError,
    EncryptionError,
    EncryptionService,
)
from libs.core.exceptions import (
    APIClientError,
    ArangoDBError,
    BaseServiceException,
    ConfigurationError,
    DatabaseConnectionError,
    ErrorCode,
    ExternalServiceError,
    KafkaError,
    RedisError,
    ResponseStatus,
    ValidationError,
    VectorDBError,
)
from libs.core.featureflag import (
    EnvFileProvider,
    EtcdProvider,
    FeatureFlags,
    FeatureFlagService,
    IConfigProvider,
)
from libs.core.logging import create_logger
from libs.core.resilience import (
    DeadLetterQueue,
    DLQMessage,
    RetryConfig,
    retry_async,
    retry_with_backoff,
)
from libs.core.utils import (
    build_redis_url,
    get_epoch_timestamp_in_ms,
)

__all__ = [
    # Logging
    "create_logger",
    # Exceptions
    "BaseServiceException",
    "ConfigurationError",
    "DatabaseConnectionError",
    "ExternalServiceError",
    "ValidationError",
    "ArangoDBError",
    "RedisError",
    "VectorDBError",
    "KafkaError",
    "APIClientError",
    "ErrorCode",
    "ResponseStatus",
    # Encryption
    "EncryptionService",
    "EncryptionError",
    "DecryptionError",
    # Constants
    "ConfigPath",
    "DefaultEndpoint",
    "TokenScope",
    "KafkaClientId",
    "RedisConfig",
    "HttpStatusCode",
    "ArangoCollection",
    "ConnectorName",
    "AccountType",
    "EventType",
    "ProgressStatus",
    # Configuration
    "KeyValueStore",
    "ConfigurationService",
    # Utils
    "build_redis_url",
    "get_epoch_timestamp_in_ms",
    # Resilience
    "retry_with_backoff",
    "retry_async",
    "RetryConfig",
    "DeadLetterQueue",
    "DLQMessage",
    # Feature Flags
    "FeatureFlagService",
    "IConfigProvider",
    "EnvFileProvider",
    "EtcdProvider",
    "FeatureFlags",
]

