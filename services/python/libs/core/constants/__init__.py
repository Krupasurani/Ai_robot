"""
Core Constants - Centralized configuration constants and enums.

This package provides all shared constants used across services.
"""

# Re-export from main constants module
# Re-export from ai_models constants
from libs.core.constants.ai_models import (
    AzureDocIntelligenceModel,
    OCRProvider,
)

# Re-export from arangodb constants
from libs.core.constants.arangodb import (
    RECORD_TYPE_COLLECTION_MAPPING,
    AccountType,
    AppGroups,
    CollectionNames,
    Connectors,
    DepartmentNames,
    EventTypes,
    ExtensionTypes,
    GraphNames,
    LegacyCollectionNames,
    LegacyGraphNames,
    MimeTypes,
    OriginTypes,
    ProgressStatus,
    QdrantCollectionNames,
    RecordRelations,
    RecordTypes,
)
from libs.core.constants.base import (
    AccountType as BaseAccountType,
)
from libs.core.constants.base import (
    ArangoCollection,
    CeleryConfig,
    ConfigPath,
    ConnectorName,
    DefaultEndpoint,
    EventType,
    HealthCheckConfig,
    HttpStatusCode,
    KafkaClientId,
    RedisConfig,
    Route,
    TokenScope,
    WebhookConfig,
)
from libs.core.constants.base import (
    ProgressStatus as BaseProgressStatus,
)

__all__ = [
    # Base constants
    "ConfigPath",
    "DefaultEndpoint",
    "TokenScope",
    "KafkaClientId",
    "RedisConfig",
    "Route",
    "WebhookConfig",
    "CeleryConfig",
    "HttpStatusCode",
    "ArangoCollection",
    "ConnectorName",
    "BaseAccountType",
    "EventType",
    "BaseProgressStatus",
    "HealthCheckConfig",
    # ArangoDB constants
    "DepartmentNames",
    "Connectors",
    "AppGroups",
    "OriginTypes",
    "LegacyCollectionNames",
    "LegacyGraphNames",
    "GraphNames",
    "CollectionNames",
    "QdrantCollectionNames",
    "ExtensionTypes",
    "MimeTypes",
    "ProgressStatus",
    "RecordTypes",
    "RecordRelations",
    "EventTypes",
    "AccountType",
    "RECORD_TYPE_COLLECTION_MAPPING",
    # AI model constants
    "OCRProvider",
    "AzureDocIntelligenceModel",
]

