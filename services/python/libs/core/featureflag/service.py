"""
Feature Flag Service - Singleton service for managing feature flags.

This module provides a thread-safe singleton service for checking feature flags
with support for multiple configuration providers.
"""

import os
from logging import Logger
from threading import Lock
from typing import TYPE_CHECKING, Optional

from libs.core.featureflag.interface import IConfigProvider

if TYPE_CHECKING:
    from libs.core.featureflag.providers.etcd import EtcdProvider

DEFAULT_ENV_PATH = '../../../.env'


class FeatureFlagService:
    """
    Singleton service for managing feature flags.

    This service provides a centralized way to check feature flags with
    support for multiple backends (env files, ETCD, etc.).

    Usage:
        # Get singleton instance (creates with default EnvFileProvider)
        service = FeatureFlagService.get_service()

        # Check a feature flag
        if service.is_feature_enabled("ENABLE_WORKFLOW_BUILDER"):
            # Feature is enabled
            pass

        # Initialize with custom provider
        from libs.core.featureflag import EtcdProvider
        provider = EtcdProvider(config_service)
        service = await FeatureFlagService.init_with_etcd_provider(provider, logger)
    """

    _instance: Optional['FeatureFlagService'] = None
    _lock: Lock = Lock()

    def __init__(self, provider: IConfigProvider) -> None:
        """
        Private constructor - use get_service() instead.

        Args:
            provider: Configuration provider implementing IConfigProvider.

        Raises:
            RuntimeError: If called directly instead of using get_service().
        """
        if FeatureFlagService._instance is not None:
            raise RuntimeError("Use get_service() to get the singleton instance")

        self._provider = provider

    @classmethod
    def get_service(cls, provider: Optional[IConfigProvider] = None) -> 'FeatureFlagService':
        """
        Get or create the singleton instance (thread-safe).

        Args:
            provider: Optional provider for first-time initialization.
                     If not provided, defaults to EnvFileProvider.

        Returns:
            FeatureFlagService singleton instance.
        """
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    # Default to EnvFileProvider if no provider specified
                    if provider is None:
                        from libs.core.featureflag.providers.env import EnvFileProvider

                        # Get default .env path relative to this file
                        default_env_path = os.path.join(
                            os.path.dirname(os.path.abspath(__file__)),
                            DEFAULT_ENV_PATH
                        )
                        env_path = os.getenv(
                            'FEATURE_FLAG_ENV_PATH',
                            default_env_path
                        )
                        provider = EnvFileProvider(env_path)

                    cls._instance = cls(provider)

        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """
        Reset singleton instance.

        Useful for testing to ensure a clean state between tests.
        """
        with cls._lock:
            cls._instance = None

    @classmethod
    async def init_with_etcd_provider(
        cls,
        provider: "EtcdProvider",
        logger: Logger,
    ) -> 'FeatureFlagService':
        """
        Initialize the singleton to use EtcdProvider as the provider.

        The provider is refreshed once during initialization to load
        the current feature flag values.

        Args:
            provider: EtcdProvider instance configured with ConfigurationService.
            logger: Logger instance for error reporting.

        Returns:
            FeatureFlagService singleton instance.
        """
        with cls._lock:
            try:
                await provider.refresh()
            except Exception as e:
                logger.debug(f"Feature flag provider refresh failed: {e}")
                pass
            cls._instance = cls(provider)
            return cls._instance

    def is_feature_enabled(self, flag_name: str, default: bool = False) -> bool:
        """
        Check if a feature flag is enabled.

        Args:
            flag_name: Name of the feature flag (e.g., 'ENABLE_WORKFLOW_BUILDER').
            default: Default value if flag is not found.

        Returns:
            True if feature is enabled, False otherwise.
        """
        value = self._provider.get_flag_value(flag_name)
        return value if value is not None else default

    async def refresh(self) -> None:
        """
        Refresh feature flags from the provider.

        Call this method to reload all feature flags from the underlying
        data source.
        """
        await self._provider.refresh()

    def set_provider(self, provider: IConfigProvider) -> None:
        """
        Set a new configuration provider (Dependency Injection).

        Allows runtime switching of providers for:
        - Testing with mock providers
        - Migrating from .env to etcd
        - Adding header override layer

        Args:
            provider: New configuration provider.
        """
        self._provider = provider

