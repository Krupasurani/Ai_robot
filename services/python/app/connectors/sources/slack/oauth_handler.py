"""
Slack OAuth Handler

Handles Slack-specific OAuth v2 flow including:
- Token exchange with Slack's response format
- Bot and User token handling
- Token refresh with rotation support
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from aiohttp import ClientSession

from libs.core.config import KeyValueStore

logger = logging.getLogger(__name__)


@dataclass
class SlackOAuthToken:
    """
    Slack OAuth Token representation.

    Slack's OAuth v2 response includes both bot and user tokens:
    - Bot token (access_token): For workspace-level access
    - User token (authed_user.access_token): For DM access
    """
    # Bot token
    access_token: str
    token_type: str = "bot"
    scope: Optional[str] = None
    bot_user_id: Optional[str] = None
    app_id: Optional[str] = None

    # Refresh token (for token rotation)
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None

    # Team/Workspace info
    team_id: Optional[str] = None
    team_name: Optional[str] = None

    # Enterprise info (for Enterprise Grid)
    enterprise_id: Optional[str] = None
    enterprise_name: Optional[str] = None
    is_enterprise_install: bool = False

    # User token (for DM access)
    user_id: Optional[str] = None
    user_access_token: Optional[str] = None
    user_token_type: Optional[str] = None
    user_scope: Optional[str] = None
    user_refresh_token: Optional[str] = None
    user_expires_in: Optional[int] = None

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    incoming_webhook: Optional[Dict[str, Any]] = None

    @property
    def is_expired(self) -> bool:
        """Check if bot token is expired."""
        if not self.expires_in:
            return False  # Tokens without expiry don't expire
        expiry_time = self.created_at + timedelta(seconds=self.expires_in)
        return datetime.now() >= expiry_time

    @property
    def user_token_is_expired(self) -> bool:
        """Check if user token is expired."""
        if not self.user_expires_in:
            return False
        expiry_time = self.created_at + timedelta(seconds=self.user_expires_in)
        return datetime.now() >= expiry_time

    @property
    def bot_scopes(self) -> List[str]:
        """Get list of bot scopes."""
        if not self.scope:
            return []
        return [s.strip() for s in self.scope.split(",")]

    @property
    def user_scopes(self) -> List[str]:
        """Get list of user scopes."""
        if not self.user_scope:
            return []
        return [s.strip() for s in self.user_scope.split(",")]

    def to_dict(self) -> Dict[str, Any]:
        """Convert token to dictionary for storage."""
        return {
            "access_token": self.access_token,
            "token_type": self.token_type,
            "scope": self.scope,
            "bot_user_id": self.bot_user_id,
            "app_id": self.app_id,
            "refresh_token": self.refresh_token,
            "expires_in": self.expires_in,
            "team_id": self.team_id,
            "team_name": self.team_name,
            "enterprise_id": self.enterprise_id,
            "enterprise_name": self.enterprise_name,
            "is_enterprise_install": self.is_enterprise_install,
            "user_id": self.user_id,
            "user_access_token": self.user_access_token,
            "user_token_type": self.user_token_type,
            "user_scope": self.user_scope,
            "user_refresh_token": self.user_refresh_token,
            "user_expires_in": self.user_expires_in,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SlackOAuthToken":
        """Create token from stored dictionary."""
        if "created_at" in data and isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})

    @classmethod
    def from_slack_response(cls, response: Dict[str, Any]) -> "SlackOAuthToken":
        """
        Create token from Slack OAuth v2 response.

        Slack's response format:
        {
            "ok": true,
            "access_token": "xoxb-...",
            "token_type": "bot",
            "scope": "channels:read,...",
            "bot_user_id": "U...",
            "app_id": "A...",
            "team": {"name": "...", "id": "T..."},
            "enterprise": {"name": "...", "id": "E..."} or null,
            "is_enterprise_install": false,
            "authed_user": {
                "id": "U...",
                "scope": "im:read,...",
                "access_token": "xoxp-...",
                "token_type": "user",
                "refresh_token": "xoxe-...",
                "expires_in": 43200
            },
            "refresh_token": "xoxe-...",
            "expires_in": 43200
        }
        """
        team = response.get("team", {})
        enterprise = response.get("enterprise") or {}
        authed_user = response.get("authed_user") or {}

        return cls(
            access_token=response.get("access_token", ""),
            token_type=response.get("token_type", "bot"),
            scope=response.get("scope"),
            bot_user_id=response.get("bot_user_id"),
            app_id=response.get("app_id"),
            refresh_token=response.get("refresh_token"),
            expires_in=response.get("expires_in"),
            team_id=team.get("id"),
            team_name=team.get("name"),
            enterprise_id=enterprise.get("id"),
            enterprise_name=enterprise.get("name"),
            is_enterprise_install=response.get("is_enterprise_install", False),
            user_id=authed_user.get("id"),
            user_access_token=authed_user.get("access_token"),
            user_token_type=authed_user.get("token_type"),
            user_scope=authed_user.get("scope"),
            user_refresh_token=authed_user.get("refresh_token"),
            user_expires_in=authed_user.get("expires_in"),
            incoming_webhook=response.get("incoming_webhook"),
        )


class SlackOAuthProvider:
    """
    Slack OAuth Provider for handling Slack-specific OAuth v2 flows.

    This provider handles:
    - Authorization URL generation
    - Token exchange
    - Token refresh with rotation
    - Both bot and user token management
    """

    AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize"
    TOKEN_URL = "https://slack.com/api/oauth.v2.access"

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        key_value_store: KeyValueStore,
        credentials_path: str,
        bot_scopes: Optional[List[str]] = None,
        user_scopes: Optional[List[str]] = None,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.key_value_store = key_value_store
        self.credentials_path = credentials_path
        self.bot_scopes = bot_scopes or []
        self.user_scopes = user_scopes or []
        self._session: Optional[ClientSession] = None

    @property
    async def session(self) -> ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = ClientSession()
        return self._session

    async def close(self) -> None:
        """Close the aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()

    def get_authorization_url(self, state: str) -> str:
        """
        Generate Slack OAuth authorization URL.

        Args:
            state: CSRF protection state token

        Returns:
            Authorization URL for Slack OAuth
        """
        from urllib.parse import urlencode

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": state,
        }

        # Add bot scopes
        if self.bot_scopes:
            params["scope"] = ",".join(self.bot_scopes)

        # Add user scopes (for DM access)
        if self.user_scopes:
            params["user_scope"] = ",".join(self.user_scopes)

        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def exchange_code_for_token(self, code: str) -> SlackOAuthToken:
        """
        Exchange authorization code for access tokens.

        Args:
            code: Authorization code from Slack callback

        Returns:
            SlackOAuthToken containing bot and user tokens
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
        }

        session = await self.session
        async with session.post(self.TOKEN_URL, data=data) as response:
            response.raise_for_status()
            token_data = await response.json()

        if not token_data.get("ok"):
            error = token_data.get("error", "Unknown error")
            raise Exception(f"Slack OAuth error: {error}")

        token = SlackOAuthToken.from_slack_response(token_data)

        # Store token
        await self._store_token(token)

        return token

    async def refresh_access_token(
        self, refresh_token: str, grant_type: str = "refresh_token"
    ) -> SlackOAuthToken:
        """
        Refresh bot access token using refresh token.

        Slack uses token rotation - a new refresh token is issued each time.

        Args:
            refresh_token: Current refresh token
            grant_type: OAuth grant type (default: refresh_token)

        Returns:
            New SlackOAuthToken with refreshed credentials
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": grant_type,
            "refresh_token": refresh_token,
        }

        session = await self.session
        async with session.post(self.TOKEN_URL, data=data) as response:
            response.raise_for_status()
            token_data = await response.json()

        if not token_data.get("ok"):
            error = token_data.get("error", "Unknown error")
            raise Exception(f"Slack token refresh error: {error}")

        token = SlackOAuthToken.from_slack_response(token_data)

        # Store new token
        await self._store_token(token)

        logger.info(f"Refreshed Slack token for team {token.team_id}")
        return token

    async def _store_token(self, token: SlackOAuthToken) -> None:
        """Store token in key-value store."""
        config = await self.key_value_store.get_key(self.credentials_path)
        if not isinstance(config, dict):
            config = {}

        config["credentials"] = token.to_dict()
        await self.key_value_store.create_key(self.credentials_path, config)

    async def get_stored_token(self) -> Optional[SlackOAuthToken]:
        """Retrieve stored token from key-value store."""
        config = await self.key_value_store.get_key(self.credentials_path)
        if not config or not config.get("credentials"):
            return None

        return SlackOAuthToken.from_dict(config["credentials"])

    async def ensure_valid_token(self) -> SlackOAuthToken:
        """
        Ensure we have a valid (non-expired) token.

        Automatically refreshes if needed.
        """
        token = await self.get_stored_token()
        if not token:
            raise ValueError("No Slack token found. Please authorize the app first.")

        if token.is_expired and token.refresh_token:
            token = await self.refresh_access_token(token.refresh_token)
        elif token.is_expired:
            raise ValueError(
                "Slack token expired and no refresh token available. "
                "Please re-authorize the app."
            )

        return token


async def handle_slack_oauth_callback(
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    key_value_store: KeyValueStore,
    credentials_path: str,
) -> SlackOAuthToken:
    """
    Handle Slack OAuth callback and exchange code for tokens.

    This is a convenience function for handling the OAuth callback.

    Args:
        code: Authorization code from Slack
        client_id: Slack App Client ID
        client_secret: Slack App Client Secret
        redirect_uri: OAuth redirect URI
        key_value_store: Key-value store for token storage
        credentials_path: Path for storing credentials

    Returns:
        SlackOAuthToken containing the exchanged tokens
    """
    provider = SlackOAuthProvider(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=redirect_uri,
        key_value_store=key_value_store,
        credentials_path=credentials_path,
    )

    try:
        token = await provider.exchange_code_for_token(code)
        return token
    finally:
        await provider.close()




