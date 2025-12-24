"""
Slack User Authorization Service

Manages user-specific Slack OAuth tokens for DM access.
Each user must individually authorize the app to access their private messages.

This enables RBAC-compliant access to:
- Direct Messages (DMs)
- Multi-Person Direct Messages (MPDMs)
"""

import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from aiohttp import ClientSession

from app.connectors.services.base_arango_service import BaseArangoService
from libs.core.config import KeyValueStore
from libs.core.constants import CollectionNames

logger = logging.getLogger(__name__)


@dataclass
class SlackUserToken:
    """
    Represents a Slack user's OAuth token for DM access.

    This token grants access to the user's:
    - Direct messages (im:read, im:history)
    - Multi-person DMs (mpim:read, mpim:history)
    """
    user_id: str  # Thero user ID
    slack_user_id: str  # Slack user ID
    access_token: str
    token_type: str = "user"
    scope: Optional[str] = None
    refresh_token: Optional[str] = None
    expires_in: Optional[int] = None
    team_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    @property
    def is_expired(self) -> bool:
        """Check if token is expired."""
        if not self.expires_in:
            return False
        expiry_time = self.created_at + timedelta(seconds=self.expires_in)
        return datetime.now() >= expiry_time

    @property
    def scopes(self) -> List[str]:
        """Get list of scopes."""
        if not self.scope:
            return []
        return [s.strip() for s in self.scope.split(",")]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "user_id": self.user_id,
            "slack_user_id": self.slack_user_id,
            "access_token": self.access_token,
            "token_type": self.token_type,
            "scope": self.scope,
            "refresh_token": self.refresh_token,
            "expires_in": self.expires_in,
            "team_id": self.team_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "SlackUserToken":
        """Create from dictionary."""
        if "created_at" in data and isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data and isinstance(data["updated_at"], str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


# User scopes required for DM access
SLACK_USER_DM_SCOPES = [
    "im:read",
    "im:history",
    "mpim:read",
    "mpim:history",
]


class SlackUserAuthService:
    """
    Service for managing Slack user-level OAuth tokens.

    This service handles:
    - User OAuth authorization flow
    - Token storage per user
    - Token refresh
    - User token retrieval for DM crawling
    """

    AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize"
    TOKEN_URL = "https://slack.com/api/oauth.v2.access"

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        key_value_store: KeyValueStore,
        arango_service: BaseArangoService,
        org_id: str,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        if self.redirect_uri.startswith('http://') and 'localhost' not in self.redirect_uri and '127.0.0.1' not in self.redirect_uri:
            self.redirect_uri = self.redirect_uri.replace('http://', 'https://', 1)
        self.key_value_store = key_value_store
        self.arango_service = arango_service
        self.org_id = org_id
        self._session: Optional[ClientSession] = None
        self._pending_states: Dict[str, str] = {}  # state -> user_id

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

    def generate_user_auth_url(self, user_id: str, team_id: Optional[str] = None) -> str:
        """
        Generate OAuth URL for user authorization.

        Args:
            user_id: Thero user ID
            team_id: Optional Slack team ID to restrict authorization

        Returns:
            OAuth URL for user to authorize
        """
        from urllib.parse import urlencode

        state = secrets.token_urlsafe(32)
        self._pending_states[state] = user_id

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "user_scope": ",".join(SLACK_USER_DM_SCOPES),
            "state": state,
        }

        # If team_id specified, restrict to that workspace
        if team_id:
            params["team"] = team_id

        return f"{self.AUTHORIZE_URL}?{urlencode(params)}"

    async def handle_user_oauth_callback(
        self, code: str, state: str
    ) -> SlackUserToken:
        """
        Handle OAuth callback for user authorization.

        Args:
            code: Authorization code from Slack
            state: State parameter for CSRF validation

        Returns:
            SlackUserToken for the authorized user
        """
        # Validate state
        user_id = self._pending_states.pop(state, None)
        if not user_id:
            raise ValueError("Invalid or expired state parameter")

        # Exchange code for token
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
            raise Exception(f"Slack user OAuth error: {error}")

        # Extract user token from response
        authed_user = token_data.get("authed_user", {})
        if not authed_user.get("access_token"):
            raise Exception("No user access token in Slack response")

        team = token_data.get("team", {})

        user_token = SlackUserToken(
            user_id=user_id,
            slack_user_id=authed_user.get("id", ""),
            access_token=authed_user.get("access_token", ""),
            token_type=authed_user.get("token_type", "user"),
            scope=authed_user.get("scope"),
            refresh_token=authed_user.get("refresh_token"),
            expires_in=authed_user.get("expires_in"),
            team_id=team.get("id"),
        )

        # Store user token
        await self._store_user_token(user_token)

        logger.info(
            f"User {user_id} authorized Slack access for team {user_token.team_id}"
        )
        return user_token

    async def _store_user_token(self, token: SlackUserToken) -> None:
        """Store user token in the database."""
        token_key = self._get_user_token_key(token.user_id)
        token_data = token.to_dict()

        # Encrypt sensitive fields before storage
        # Note: In production, access_token and refresh_token should be encrypted

        await self.key_value_store.create_key(token_key, token_data)

        # Also store reference in user's profile
        await self._update_user_slack_status(token.user_id, connected=True)

    async def _update_user_slack_status(
        self, user_id: str, connected: bool
    ) -> None:
        """Update user's Slack connection status in their profile."""
        try:
            # Update user document with Slack connection info
            user_doc = await self.arango_service.get_document_by_key(
                CollectionNames.USERS.value, user_id
            )
            if user_doc:
                integrations = user_doc.get("integrations", {})
                integrations["slack"] = {
                    "connected": connected,
                    "connected_at": datetime.now().isoformat() if connected else None,
                }
                await self.arango_service.update_document(
                    CollectionNames.USERS.value,
                    user_id,
                    {"integrations": integrations},
                )
        except Exception as e:
            logger.warning(f"Failed to update user Slack status: {e}")

    def _get_user_token_key(self, user_id: str) -> str:
        """Get key-value store key for user's Slack token."""
        return f"/services/connectors/slack/user_tokens/{self.org_id}/{user_id}"

    async def get_user_token(self, user_id: str) -> Optional[SlackUserToken]:
        """
        Get user's Slack token.

        Args:
            user_id: Thero user ID

        Returns:
            SlackUserToken if exists, None otherwise
        """
        token_key = self._get_user_token_key(user_id)
        token_data = await self.key_value_store.get_key(token_key)

        if not token_data:
            return None

        return SlackUserToken.from_dict(token_data)

    async def refresh_user_token(self, user_id: str) -> Optional[SlackUserToken]:
        """
        Refresh user's Slack token.

        Args:
            user_id: Thero user ID

        Returns:
            Refreshed SlackUserToken or None if refresh fails
        """
        token = await self.get_user_token(user_id)
        if not token or not token.refresh_token:
            return None

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token",
            "refresh_token": token.refresh_token,
        }

        try:
            session = await self.session
            async with session.post(self.TOKEN_URL, data=data) as response:
                response.raise_for_status()
                token_data = await response.json()

            if not token_data.get("ok"):
                logger.error(
                    f"Failed to refresh token for user {user_id}: "
                    f"{token_data.get('error')}"
                )
                return None

            # Update token with new credentials
            token.access_token = token_data.get("access_token", token.access_token)
            token.refresh_token = token_data.get("refresh_token", token.refresh_token)
            token.expires_in = token_data.get("expires_in", token.expires_in)
            token.updated_at = datetime.now()
            token.created_at = datetime.now()  # Reset for expiry calculation

            # Store updated token
            await self._store_user_token(token)

            logger.info(f"Refreshed Slack token for user {user_id}")
            return token

        except Exception as e:
            logger.error(f"Error refreshing Slack token for user {user_id}: {e}")
            return None

    async def revoke_user_token(self, user_id: str) -> bool:
        """
        Revoke user's Slack token and disconnect.

        Args:
            user_id: Thero user ID

        Returns:
            True if successful
        """
        token = await self.get_user_token(user_id)
        if not token:
            return True

        # Revoke token with Slack
        try:
            session = await self.session
            async with session.post(
                "https://slack.com/api/auth.revoke",
                headers={"Authorization": f"Bearer {token.access_token}"},
            ) as response:
                # Don't fail if revoke fails - just log it
                if response.status != 200:
                    logger.warning(f"Failed to revoke Slack token for user {user_id}")
        except Exception as e:
            logger.warning(f"Error revoking Slack token: {e}")

        # Delete stored token
        token_key = self._get_user_token_key(user_id)
        await self.key_value_store.delete_key(token_key)

        # Update user status
        await self._update_user_slack_status(user_id, connected=False)

        logger.info(f"Revoked Slack token for user {user_id}")
        return True

    async def get_all_authorized_users(self) -> List[SlackUserToken]:
        """
        Get all users who have authorized Slack access.

        Returns:
            List of SlackUserTokens for all authorized users
        """
        prefix = f"/services/connectors/slack/user_tokens/{self.org_id}/"

        try:
            # Get all keys with prefix
            keys = await self.key_value_store.list_keys(prefix)
            tokens = []

            for key in keys:
                token_data = await self.key_value_store.get_key(key)
                if token_data:
                    tokens.append(SlackUserToken.from_dict(token_data))

            return tokens
        except Exception as e:
            logger.error(f"Error getting authorized users: {e}")
            return []

    async def ensure_valid_user_token(
        self, user_id: str
    ) -> Optional[SlackUserToken]:
        """
        Ensure user has a valid (non-expired) token.

        Automatically refreshes if needed.

        Args:
            user_id: Thero user ID

        Returns:
            Valid SlackUserToken or None if unavailable
        """
        token = await self.get_user_token(user_id)
        if not token:
            return None

        if token.is_expired:
            if token.refresh_token:
                token = await self.refresh_user_token(user_id)
            else:
                logger.warning(
                    f"User {user_id} Slack token expired without refresh token"
                )
                return None

        return token


