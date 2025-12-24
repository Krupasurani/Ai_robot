"""
ETCD Provider - Feature flag provider using ETCD via ConfigurationService.

This module provides a feature flag provider that reads flags from ETCD,
suitable for production deployments with distributed configuration.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Dict, Optional

from libs.core.featureflag.interface import IConfigProvider
from libs.core.logging import create_logger

if TYPE_CHECKING:
    from libs.core.config import ConfigurationService

logger = create_logger("featureflag.etcd")


class EtcdProvider(IConfigProvider):
    """
    Provider that reads feature flags from ETCD via ConfigurationService.

    Expects a JSON object at key '/services/platform/settings' with shape:
        {
            "fileUploadMaxSizeBytes": number,
            "featureFlags": { [flag: string]: boolean }
        }

    Usage:
        provider = EtcdProvider(config_service)
        await provider.refresh()
        value = provider.get_flag_value("ENABLE_FEATURE")
    """

    SETTINGS_KEY = "/services/platform/settings"

    def __init__(self, config_service: "ConfigurationService") -> None:
        """
        Initialize the provider with ConfigurationService.

        Args:
            config_service: ConfigurationService instance for ETCD access.
        """
        self._config_service = config_service
        self._flags: Dict[str, bool] = {}

    async def refresh(self) -> None:
        """
        Refresh feature flags from ConfigurationService.

        This method fetches the latest feature flags from ETCD and updates
        the local cache. On error, existing flags are preserved for better
        availability during transient failures.
        """
        try:
            settings = await self._config_service.get_config(
                self.SETTINGS_KEY, default={}
            )
            logger.debug("Settings: %s", settings)

            # Extract and validate feature flags
            feature_flags = (
                settings.get("featureFlags", {})
                if isinstance(settings, dict)
                else {}
            )
            logger.debug("Feature flags: %s", feature_flags)

            if isinstance(feature_flags, dict):
                # Normalize keys to upper-case for consistency
                self._flags = {
                    str(k).upper(): bool(v) for k, v in feature_flags.items()
                }
                logger.debug("Feature flags refreshed: %s", list(self._flags.keys()))
            else:
                logger.warning(
                    "Invalid featureFlags format, expected dict, got %s",
                    type(feature_flags)
                )
                self._flags = {}

        except Exception as e:
            logger.error("Failed to refresh feature flags: %s", str(e), exc_info=True)
            # Keep existing flags on error rather than clearing them
            # This provides better availability during transient failures

    def get_flag_value(self, flag_name: str) -> Optional[bool]:
        """
        Get the value of a feature flag by name (case-insensitive).

        Args:
            flag_name: Name of the flag.

        Returns:
            Boolean value of the flag, or None if not found.
        """
        return self._flags.get(str(flag_name).upper())

    def get_all_flags(self) -> Dict[str, bool]:
        """
        Get all feature flags as a dictionary.

        Returns:
            Copy of all feature flags.
        """
        return self._flags.copy()

