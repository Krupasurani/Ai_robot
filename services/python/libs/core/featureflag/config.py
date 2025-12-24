"""
Feature Flag Configuration - Constants for feature flag names.

This module defines the known feature flag constants used throughout
the application.
"""


class FeatureFlags:
    """
    Feature flag configuration constants.

    Usage:
        from libs.core.featureflag import FeatureFlagService, FeatureFlags

        service = FeatureFlagService.get_service()
        if service.is_feature_enabled(FeatureFlags.ENABLE_WORKFLOW_BUILDER):
            # Feature is enabled
            pass
    """

    # Workflow features
    ENABLE_WORKFLOW_BUILDER = "ENABLE_WORKFLOW_BUILDER"

    # Connector features
    ENABLE_BETA_CONNECTORS = "ENABLE_BETA_CONNECTORS"

    # Add new feature flags here as needed
    # Example:
    # ENABLE_NEW_FEATURE = "ENABLE_NEW_FEATURE"

