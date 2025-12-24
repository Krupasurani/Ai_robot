"""
Feature Flag Provider Interface - Abstract interface for config providers.

This module defines the interface that all feature flag providers must implement.
"""

from abc import ABC, abstractmethod
from typing import Optional


class IConfigProvider(ABC):
    """
    Interface for configuration providers.

    This interface follows the Open/Closed Principle - open for extension,
    closed for modification. New providers can be added without changing
    existing code.

    Implementations:
        - EnvFileProvider: Reads from .env files.
        - EtcdProvider: Reads from ETCD via ConfigurationService.
        - Future: DatabaseProvider, HeaderOverrideProvider, etc.
    """

    @abstractmethod
    def get_flag_value(self, flag_name: str) -> Optional[bool]:
        """
        Get the boolean value of a feature flag.

        Args:
            flag_name: Name of the feature flag to retrieve.

        Returns:
            True if enabled, False if disabled, None if not found.
        """
        pass

    @abstractmethod
    async def refresh(self) -> None:
        """
        Refresh configuration from source.

        This method should reload all feature flags from the underlying
        data source. It's called periodically or on-demand to ensure
        flags are up-to-date.
        """
        pass

