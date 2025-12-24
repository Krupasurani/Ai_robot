"""
Qdrant Configuration - Configuration dataclass for Qdrant connections.

This module provides a typed configuration structure for Qdrant connections,
supporting both direct instantiation and creation from dictionaries.

Usage:
    from libs.data.vector import QdrantConfig

    # Direct instantiation
    config = QdrantConfig(
        host="localhost",
        port=6333,
        api_key="your-api-key"
    )

    # From dictionary
    config = QdrantConfig.from_dict(config_dict)
"""

from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class QdrantConfig:
    """
    Configuration for Qdrant vector database connections.

    Attributes:
        host: Qdrant server hostname.
        port: Qdrant server port (default: 6333).
        grpc_port: Qdrant gRPC port (default: 6334).
        api_key: Optional API key for authentication.
        https: Whether to use HTTPS (default: False).
        timeout: Connection timeout in seconds (default: 300).

    Example:
        >>> config = QdrantConfig(
        ...     host="localhost",
        ...     port=6333,
        ...     api_key="your-api-key"
        ... )
    """

    host: str
    port: int = 6333
    grpc_port: int = 6334
    api_key: Optional[str] = None
    https: bool = False
    timeout: int = 300

    @property
    def qdrant_config(self) -> Dict[str, Any]:
        """
        Get configuration as a dictionary.

        Returns:
            Dictionary with Qdrant connection parameters.
        """
        return {
            "host": self.host,
            "port": self.port,
            "grpcPort": self.grpc_port,
            "apiKey": self.api_key,
            "https": self.https,
            "timeout": self.timeout,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "QdrantConfig":
        """
        Create configuration from a dictionary.

        Args:
            data: Dictionary containing Qdrant connection parameters.

        Returns:
            QdrantConfig instance.
        """
        return cls(
            host=data.get("host", "localhost"),
            port=data.get("port", 6333),
            grpc_port=data.get("grpcPort", 6334),
            api_key=data.get("apiKey"),
            https=data.get("https", False),
            timeout=data.get("timeout", 300),
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to a dictionary.

        Returns:
            Dictionary representation of the configuration.
        """
        return self.qdrant_config

