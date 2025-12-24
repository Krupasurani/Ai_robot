"""
Feature Flag Module - Feature flag management service.

This module provides a singleton service for managing feature flags with
extensible architecture supporting multiple backends (env files, ETCD).

Components:
    - FeatureFlagService: Main singleton service for feature flag management.
    - IConfigProvider: Abstract interface for configuration providers.
    - EnvFileProvider: Provider that reads flags from .env files.
    - EtcdProvider: Provider that reads flags from ETCD via ConfigurationService.
    - FeatureFlags: Constants for known feature flag names.

Usage:
    from libs.core.featureflag import FeatureFlagService, FeatureFlags

    service = FeatureFlagService.get_service()
    if service.is_feature_enabled(FeatureFlags.ENABLE_WORKFLOW_BUILDER):
        # Feature is enabled
        pass
"""

from libs.core.featureflag.config import FeatureFlags
from libs.core.featureflag.interface import IConfigProvider
from libs.core.featureflag.providers.env import EnvFileProvider
from libs.core.featureflag.providers.etcd import EtcdProvider
from libs.core.featureflag.service import FeatureFlagService

__all__ = [
    "FeatureFlagService",
    "IConfigProvider",
    "EnvFileProvider",
    "EtcdProvider",
    "FeatureFlags",
]

