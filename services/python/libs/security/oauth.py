"""
OAuth Utilities - OAuth configuration helpers.

This module provides utilities for OAuth configuration management.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from libs.core.constants import ConnectorName


@dataclass
class OAuthConfig:
    """
    OAuth configuration for external service authentication.

    Attributes:
        client_id: OAuth client ID.
        client_secret: OAuth client secret.
        redirect_uri: OAuth redirect URI.
        authorize_url: OAuth authorization endpoint.
        token_url: OAuth token endpoint.
        scope: Space-separated list of OAuth scopes.
        token_access_type: Token access type (e.g., "offline" for refresh tokens).
        additional_params: Additional OAuth parameters.
    """

    client_id: str
    client_secret: str
    redirect_uri: str = ""
    authorize_url: str = ""
    token_url: str = ""
    scope: str = ""
    token_access_type: Optional[str] = None
    additional_params: Dict[str, Any] = field(default_factory=dict)


def get_oauth_config(app_name: str, auth_config: Dict[str, Any]) -> OAuthConfig:
    """
    Create an OAuthConfig from authentication configuration.

    This function creates an OAuthConfig instance from a dictionary
    configuration, applying connector-specific settings as needed.

    Args:
        app_name: Name of the application/connector.
        auth_config: Dictionary containing OAuth configuration.

    Returns:
        Configured OAuthConfig instance.

    Example:
        config = get_oauth_config("dropbox", {
            "clientId": "xxx",
            "clientSecret": "yyy",
            "redirectUri": "https://...",
            "scopes": ["files.read", "files.write"],
        })
    """
    # Build scope string from list
    scopes: List[str] = auth_config.get('scopes', [])
    scope_str = ' '.join(scopes) if scopes else ''

    oauth_config = OAuthConfig(
        client_id=auth_config['clientId'],
        client_secret=auth_config['clientSecret'],
        redirect_uri=auth_config.get('redirectUri', ''),
        authorize_url=auth_config.get('authorizeUrl', ''),
        token_url=auth_config.get('tokenUrl', ''),
        scope=scope_str,
    )

    # Apply connector-specific settings
    if app_name.lower() == ConnectorName.DROPBOX.value.lower():
        oauth_config.token_access_type = "offline"

    return oauth_config

