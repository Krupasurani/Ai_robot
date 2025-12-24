"""
Exceptions Module - Standardized exception classes for all services.

This module defines a hierarchy of exception classes that provide consistent
error handling across all backend services. Each exception includes structured
error information for logging and API responses.

Exception Hierarchy:
    BaseServiceException
    ├── ConfigurationError
    ├── DatabaseConnectionError
    │   ├── ArangoDBError
    │   ├── RedisError
    │   └── VectorDBError
    ├── ExternalServiceError
    │   ├── KafkaError
    │   └── APIClientError
    └── ValidationError

Usage:
    from libs.core.exceptions import DatabaseConnectionError

    try:
        await db.connect()
    except Exception as e:
        raise DatabaseConnectionError("Failed to connect to ArangoDB", cause=e)
"""

from enum import Enum
from typing import Any, Dict, Optional


class ErrorCode(Enum):
    """
    Standardized error codes for categorizing exceptions.

    These codes can be used in API responses and logging to provide
    machine-readable error classification.
    """

    # Configuration errors (1xxx)
    CONFIG_MISSING = 1001
    CONFIG_INVALID = 1002
    CONFIG_ENCRYPTION_FAILED = 1003

    # Database errors (2xxx)
    DB_CONNECTION_FAILED = 2001
    DB_QUERY_FAILED = 2002
    DB_TIMEOUT = 2003
    DB_NOT_FOUND = 2004

    # External service errors (3xxx)
    EXTERNAL_SERVICE_UNAVAILABLE = 3001
    EXTERNAL_SERVICE_TIMEOUT = 3002
    EXTERNAL_SERVICE_AUTH_FAILED = 3003

    # Validation errors (4xxx)
    VALIDATION_FAILED = 4001
    INVALID_INPUT = 4002

    # Internal errors (5xxx)
    INTERNAL_ERROR = 5001
    NOT_IMPLEMENTED = 5002


class BaseServiceException(Exception):
    """
    Base exception class for all service-related errors.

    Provides structured error information including error codes, messages,
    and optional context data for debugging and logging.

    Attributes:
        message: Human-readable error description.
        error_code: Machine-readable error code from ErrorCode enum.
        context: Optional dictionary with additional error context.
        cause: Optional original exception that caused this error.

    Example:
        >>> raise BaseServiceException(
        ...     message="Operation failed",
        ...     error_code=ErrorCode.INTERNAL_ERROR,
        ...     context={"operation": "indexing", "record_id": "123"}
        ... )
    """

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        """
        Initialize the exception with structured error information.

        Args:
            message: Human-readable error description.
            error_code: Error code for categorization.
            context: Additional context data for debugging.
            cause: Original exception that triggered this error.
        """
        self.message = message
        self.error_code = error_code
        self.context = context or {}
        self.cause = cause

        # Build full message including cause if present
        full_message = f"[{error_code.name}] {message}"
        if cause:
            full_message += f" | Caused by: {type(cause).__name__}: {str(cause)}"

        super().__init__(full_message)

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert exception to a dictionary for API responses or logging.

        Returns:
            Dictionary containing error code, message, and context.
        """
        return {
            "error_code": self.error_code.value,
            "error_name": self.error_code.name,
            "message": self.message,
            "context": self.context,
        }


class ConfigurationError(BaseServiceException):
    """
    Exception raised when configuration loading or validation fails.

    Use this for missing environment variables, invalid config values,
    or ETCD connection issues.

    Example:
        >>> raise ConfigurationError(
        ...     "SECRET_KEY environment variable is required",
        ...     error_code=ErrorCode.CONFIG_MISSING
        ... )
    """

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.CONFIG_INVALID,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class DatabaseConnectionError(BaseServiceException):
    """
    Exception raised when database connection or query fails.

    Use this for ArangoDB, Redis, or VectorDB connection issues.

    Example:
        >>> raise DatabaseConnectionError(
        ...     "Failed to connect to ArangoDB",
        ...     error_code=ErrorCode.DB_CONNECTION_FAILED,
        ...     context={"host": "localhost", "port": 8529}
        ... )
    """

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.DB_CONNECTION_FAILED,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class ArangoDBError(DatabaseConnectionError):
    """Exception specific to ArangoDB operations."""

    pass


class RedisError(DatabaseConnectionError):
    """Exception specific to Redis operations."""

    pass


class VectorDBError(DatabaseConnectionError):
    """Exception specific to VectorDB (Qdrant/Weaviate) operations."""

    pass


class ExternalServiceError(BaseServiceException):
    """
    Exception raised when external service calls fail.

    Use this for Kafka, external APIs, or third-party service issues.

    Example:
        >>> raise ExternalServiceError(
        ...     "Kafka broker unavailable",
        ...     error_code=ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        ...     context={"broker": "localhost:9092"}
        ... )
    """

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


class KafkaError(ExternalServiceError):
    """Exception specific to Kafka operations."""

    pass


class APIClientError(ExternalServiceError):
    """Exception specific to external API client operations."""

    pass


class ValidationError(BaseServiceException):
    """
    Exception raised when input validation fails.

    Use this for invalid request data, schema validation errors,
    or business rule violations.

    Example:
        >>> raise ValidationError(
        ...     "Invalid record ID format",
        ...     error_code=ErrorCode.INVALID_INPUT,
        ...     context={"field": "record_id", "value": "invalid!"}
        ... )
    """

    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.VALIDATION_FAILED,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None,
    ) -> None:
        super().__init__(message, error_code, context, cause)


# HTTP Status Code Mapping (for FastAPI responses)
class ResponseStatus(Enum):
    """
    Standardized response status values for API responses.

    These can be used in conjunction with error codes to provide
    consistent API response structures.
    """

    SUCCESS = "success"
    ERROR = "error"
    ACCESSIBLE_RECORDS_NOT_FOUND = "accessible_records_not_found"
    VECTOR_DB_EMPTY = "vector_db_empty"
    VECTOR_DB_NOT_READY = "vector_db_not_ready"
    EMPTY_RESPONSE = "empty_response"

