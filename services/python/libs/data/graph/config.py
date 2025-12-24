"""
ArangoDB Configuration - Configuration dataclass for ArangoDB connections.

This module provides a typed configuration structure for ArangoDB connections,
supporting both direct instantiation and creation from dictionaries.

Usage:
    from libs.data.graph import ArangoConfig

    # Direct instantiation
    config = ArangoConfig(
        url="http://localhost:8529",
        db="enterprise_search",
        username="root",
        password="secret"
    )

    # From dictionary (e.g., from ConfigurationService)
    config = ArangoConfig.from_dict(config_dict)
"""

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class ArangoConfig:
    """
    Configuration for ArangoDB connections.

    Attributes:
        url: ArangoDB server URL (e.g., "http://localhost:8529").
        db: Database name to connect to.
        username: Authentication username.
        password: Authentication password.

    Example:
        >>> config = ArangoConfig(
        ...     url="http://localhost:8529",
        ...     db="enterprise_search",
        ...     username="root",
        ...     password="secret"
        ... )
        >>> print(config.url)
        "http://localhost:8529"
    """

    url: str
    db: str
    username: str
    password: str

    @property
    def arango_config(self) -> Dict[str, Any]:
        """
        Get configuration as a dictionary.

        Returns:
            Dictionary with url, db, username, and password keys.
        """
        return {
            "url": self.url,
            "db": self.db,
            "username": self.username,
            "password": self.password,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ArangoConfig":
        """
        Create configuration from a dictionary.

        Args:
            data: Dictionary containing url, db, username, and password.

        Returns:
            ArangoConfig instance.

        Example:
            >>> data = {"url": "http://localhost:8529", "db": "mydb", ...}
            >>> config = ArangoConfig.from_dict(data)
        """
        return cls(
            url=data.get("url", ""),
            db=data.get("db", ""),
            username=data.get("username", ""),
            password=data.get("password", ""),
        )

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert configuration to a dictionary.

        Returns:
            Dictionary representation of the configuration.
        """
        return {
            "url": self.url,
            "db": self.db,
            "username": self.username,
            "password": self.password,
        }

