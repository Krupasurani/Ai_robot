"""
Base Constants Module - Shared configuration constants and enums.

This module provides centralized constants used across all services,
including ETCD configuration paths, default endpoints, and service-specific
configuration values.

Usage:
    from libs.core.constants import ConfigPath, DefaultEndpoint

    kafka_config = await config_service.get_config(ConfigPath.KAFKA)
    connector_url = DefaultEndpoint.CONNECTOR
"""

from enum import Enum


class ConfigPath(Enum):
    """
    ETCD configuration paths for service settings.

    These paths are used to retrieve configuration from the distributed
    key-value store (ETCD). Each path corresponds to a specific service
    or configuration category.

    Example:
        >>> config = await config_service.get_config(ConfigPath.ARANGODB.value)
        >>> print(config["url"])
        "http://localhost:8529"
    """

    # Database services
    ARANGODB = "/services/arangodb"
    QDRANT = "/services/qdrant"
    REDIS = "/services/redis"

    # Messaging and AI
    KAFKA = "/services/kafka"
    AI_MODELS = "/services/aiModels"

    # Service discovery
    ENDPOINTS = "/services/endpoints"
    SECRET_KEYS = "/services/secretKeys"
    STORAGE = "/services/storage"
    MIGRATIONS = "/services/migrations"


class DefaultEndpoint(Enum):
    """
    Default service endpoints for local development and fallback.

    These endpoints are used when ETCD configuration is unavailable
    or for local development without a full infrastructure setup.

    Example:
        >>> endpoint = endpoints.get("connectors", {}).get(
        ...     "endpoint", DefaultEndpoint.CONNECTOR.value
        ... )
    """

    CONNECTOR = "http://localhost:8088"
    INDEXING = "http://localhost:8091"
    QUERY = "http://localhost:8000"
    NODEJS = "http://localhost:3000"
    FRONTEND = "http://localhost:3001"
    STORAGE = "http://localhost:3000"


class TokenScope(Enum):
    """
    JWT token scopes for service-to-service authentication.

    These scopes define the permissions granted to internal service tokens
    for specific operations.
    """

    SEND_MAIL = "mail:send"
    FETCH_CONFIG = "fetch:config"
    PASSWORD_RESET = "password:reset"
    USER_LOOKUP = "user:lookup"
    TOKEN_REFRESH = "token:refresh"
    STORAGE_TOKEN = "storage:token"


class KafkaClientId(Enum):
    """
    Kafka client identifiers for different consumer/producer groups.

    Each service should use a unique client ID for proper consumer group
    management and message tracking.
    """

    RECORDS = "record-processor"
    MAIN = "enterprise-search"
    LLM = "llm-configuration"
    ENTITY = "entity-producer"


class RedisConfig(Enum):
    """Redis configuration constants."""

    REDIS_DB = 0
    DEFAULT_DB = 0  # Alias for backward compatibility


class HealthCheckConfig(Enum):
    """Constants for health check configuration"""

    CONNECTOR_HEALTH_CHECK_MAX_RETRIES = 120
    CONNECTOR_HEALTH_CHECK_RETRY_INTERVAL_SECONDS = 1


class Route(Enum):
    """Internal API routes for service-to-service communication."""

    # Token paths
    INDIVIDUAL_CREDENTIALS = "/api/v1/configurationManager/internal/connectors/individual/googleWorkspaceCredentials"
    INDIVIDUAL_REFRESH_TOKEN = "/api/v1/connectors/internal/refreshIndividualConnectorToken"
    BUSINESS_CREDENTIALS = "/api/v1/configurationManager/internal/connectors/business/googleWorkspaceCredentials"

    # AI Model paths
    AI_MODEL_CONFIG = "/api/v1/configurationManager/internal/aiModelsConfig"

    # Storage paths
    STORAGE_PLACEHOLDER = "/api/v1/document/internal/placeholder"
    STORAGE_DIRECT_UPLOAD = "/api/v1/document/internal/{documentId}/directUpload"
    STORAGE_UPLOAD = "/api/v1/document/internal/upload"
    STORAGE_DOWNLOAD = "/api/v1/document/internal/{documentId}/download"


class WebhookConfig(Enum):
    """Webhook timing configuration for external service integrations."""

    EXPIRATION_DAYS = 6
    EXPIRATION_HOURS = 23
    EXPIRATION_MINUTES = 59
    COALESCE_DELAY = 60


class CeleryConfig(Enum):
    """Celery task queue configuration constants."""

    TASK_SERIALIZER = "json"
    RESULT_SERIALIZER = "json"
    ACCEPT_CONTENT = ["json"]
    TIMEZONE = "UTC"
    ENABLE_UTC = True


# HTTP Status Codes (commonly used)
class HttpStatusCode(Enum):
    """HTTP status codes for API responses."""

    SUCCESS = 200
    CREATED = 201
    NO_CONTENT = 204
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    CONFLICT = 409
    UNPROCESSABLE_ENTITY = 422
    TOO_MANY_REQUESTS = 429
    INTERNAL_SERVER_ERROR = 500
    SERVICE_UNAVAILABLE = 503
    UNHEALTHY = 503  # Alias for SERVICE_UNAVAILABLE


# ArangoDB Collection Names
class ArangoCollection(Enum):
    """ArangoDB collection names used across services."""

    RECORDS = "records"
    USERS = "users"
    ORGANIZATIONS = "organizations"
    CONNECTORS = "connectors"
    TOOLS = "tools"
    TOOLS_CTAGS = "tools_ctags"


# Connector Names
class ConnectorName(Enum):
    """Supported connector/integration names."""

    GOOGLE_DRIVE = "googledrive"
    GOOGLE_MAIL = "gmail"
    KNOWLEDGE_BASE = "knowledgebase"
    CONFLUENCE = "confluence"
    JIRA = "jira"
    SLACK = "slack"
    MICROSOFT_SHAREPOINT = "sharepoint"
    MICROSOFT_ONEDRIVE = "onedrive"


# Account Types
class AccountType(Enum):
    """Organization account type classifications."""

    INDIVIDUAL = "individual"
    BUSINESS = "business"
    ENTERPRISE = "enterprise"


# Event Types for Kafka
class EventType(Enum):
    """Kafka event types for record processing."""

    NEW_RECORD = "NEW_RECORD"
    UPDATE_RECORD = "UPDATE_RECORD"
    DELETE_RECORD = "DELETE_RECORD"
    REINDEX_RECORD = "REINDEX_RECORD"


# Progress Status for Records
class ProgressStatus(Enum):
    """Record processing status values."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

