"""
Slack Webhook Handler

Handles Slack Event Subscriptions for real-time updates.
Processes events like new messages, channel changes, and user updates.
"""

import hashlib
import hmac
import logging
import time
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class SlackEventType(str, Enum):
    """Slack event types that we handle."""

    # Message events
    MESSAGE = "message"
    MESSAGE_CHANNELS = "message.channels"
    MESSAGE_GROUPS = "message.groups"
    MESSAGE_IM = "message.im"
    MESSAGE_MPIM = "message.mpim"

    # Channel events
    CHANNEL_CREATED = "channel_created"
    CHANNEL_DELETED = "channel_deleted"
    CHANNEL_ARCHIVE = "channel_archive"
    CHANNEL_UNARCHIVE = "channel_unarchive"
    CHANNEL_RENAME = "channel_rename"

    # Member events
    MEMBER_JOINED_CHANNEL = "member_joined_channel"
    MEMBER_LEFT_CHANNEL = "member_left_channel"

    # User events
    USER_CHANGE = "user_change"
    TEAM_JOIN = "team_join"

    # File events
    FILE_SHARED = "file_shared"
    FILE_DELETED = "file_deleted"

    # App events
    APP_MENTION = "app_mention"
    APP_HOME_OPENED = "app_home_opened"

    # URL verification (for setup)
    URL_VERIFICATION = "url_verification"


@dataclass
class SlackEvent:
    """Represents a Slack event from the Events API."""

    type: str
    event_type: Optional[str] = None
    team_id: Optional[str] = None
    event_id: Optional[str] = None
    event_time: Optional[int] = None
    challenge: Optional[str] = None  # For URL verification
    event: Optional[Dict[str, Any]] = None
    authorizations: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def from_request(cls, data: Dict[str, Any]) -> "SlackEvent":
        """Create SlackEvent from request data."""
        event_data = data.get("event", {})
        return cls(
            type=data.get("type", ""),
            event_type=event_data.get("type"),
            team_id=data.get("team_id"),
            event_id=data.get("event_id"),
            event_time=data.get("event_time"),
            challenge=data.get("challenge"),
            event=event_data,
            authorizations=data.get("authorizations"),
        )


class SlackWebhookHandler:
    """
    Handles Slack webhook events for real-time sync.

    Features:
    - Request signature verification
    - Event deduplication
    - Event routing to appropriate handlers
    """

    def __init__(
        self,
        signing_secret: str,
        connector_callback: Optional[callable] = None,
    ) -> None:
        """
        Initialize the webhook handler.

        Args:
            signing_secret: Slack signing secret for request verification
            connector_callback: Optional callback to notify connector of events
        """
        self.signing_secret = signing_secret
        self.connector_callback = connector_callback
        self._processed_events: Dict[str, int] = {}  # event_id -> timestamp
        self._event_cache_ttl = 300  # 5 minutes

    def verify_request(
        self,
        timestamp: str,
        body: bytes,
        signature: str,
    ) -> bool:
        """
        Verify Slack request signature.

        Args:
            timestamp: X-Slack-Request-Timestamp header
            body: Raw request body
            signature: X-Slack-Signature header

        Returns:
            True if signature is valid
        """
        # Check timestamp to prevent replay attacks (within 5 minutes)
        try:
            request_time = int(timestamp)
            current_time = int(time.time())
            if abs(current_time - request_time) > 300:
                logger.warning("Slack request timestamp too old")
                return False
        except ValueError:
            logger.warning("Invalid Slack request timestamp")
            return False

        # Compute expected signature
        sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
        expected_signature = (
            "v0="
            + hmac.new(
                self.signing_secret.encode(),
                sig_basestring.encode(),
                hashlib.sha256,
            ).hexdigest()
        )

        # Constant-time comparison
        return hmac.compare_digest(expected_signature, signature)

    def is_duplicate_event(self, event_id: str) -> bool:
        """
        Check if event has already been processed.

        Args:
            event_id: Slack event ID

        Returns:
            True if event was already processed
        """
        if not event_id:
            return False

        # Clean up old events
        current_time = int(time.time())
        self._processed_events = {
            eid: ts
            for eid, ts in self._processed_events.items()
            if current_time - ts < self._event_cache_ttl
        }

        # Check if already processed
        if event_id in self._processed_events:
            return True

        # Mark as processed
        self._processed_events[event_id] = current_time
        return False

    async def handle_event(self, event: SlackEvent) -> Dict[str, Any]:
        """
        Handle a Slack event.

        Args:
            event: SlackEvent to process

        Returns:
            Response dict
        """
        # Handle URL verification challenge
        if event.type == SlackEventType.URL_VERIFICATION.value:
            return {"challenge": event.challenge}

        # Check for duplicate events
        if self.is_duplicate_event(event.event_id):
            logger.debug(f"Skipping duplicate event: {event.event_id}")
            return {"ok": True, "message": "duplicate"}

        # Route event to appropriate handler
        event_type = event.event_type

        if event_type in [
            SlackEventType.MESSAGE.value,
            SlackEventType.MESSAGE_CHANNELS.value,
            SlackEventType.MESSAGE_GROUPS.value,
        ]:
            await self._handle_message_event(event)

        elif event_type in [
            SlackEventType.MESSAGE_IM.value,
            SlackEventType.MESSAGE_MPIM.value,
        ]:
            await self._handle_dm_message_event(event)

        elif event_type in [
            SlackEventType.CHANNEL_CREATED.value,
            SlackEventType.CHANNEL_DELETED.value,
            SlackEventType.CHANNEL_ARCHIVE.value,
            SlackEventType.CHANNEL_UNARCHIVE.value,
            SlackEventType.CHANNEL_RENAME.value,
        ]:
            await self._handle_channel_event(event)

        elif event_type in [
            SlackEventType.MEMBER_JOINED_CHANNEL.value,
            SlackEventType.MEMBER_LEFT_CHANNEL.value,
        ]:
            await self._handle_member_event(event)

        elif event_type in [
            SlackEventType.USER_CHANGE.value,
            SlackEventType.TEAM_JOIN.value,
        ]:
            await self._handle_user_event(event)

        elif event_type in [
            SlackEventType.FILE_SHARED.value,
            SlackEventType.FILE_DELETED.value,
        ]:
            await self._handle_file_event(event)

        else:
            logger.debug(f"Unhandled event type: {event_type}")

        return {"ok": True}

    async def _handle_message_event(self, event: SlackEvent) -> None:
        """Handle new message events in channels."""
        event_data = event.event or {}

        # Skip message subtypes we don't want to index
        subtype = event_data.get("subtype")
        if subtype in ["bot_message", "message_changed", "message_deleted"]:
            return

        channel_id = event_data.get("channel")
        message_ts = event_data.get("ts")
        text = event_data.get("text", "")

        logger.info(
            f"New message in channel {channel_id}: {text[:50]}..."
            if len(text) > 50
            else f"New message in channel {channel_id}: {text}"
        )

        # Notify connector to process new message
        if self.connector_callback:
            await self.connector_callback(
                "message",
                {
                    "channel_id": channel_id,
                    "message_ts": message_ts,
                    "team_id": event.team_id,
                },
            )

    async def _handle_dm_message_event(self, event: SlackEvent) -> None:
        """Handle new DM/MPDM message events."""
        event_data = event.event or {}

        channel_id = event_data.get("channel")
        user_id = event_data.get("user")

        logger.info(f"New DM in channel {channel_id} from user {user_id}")

        # DM events require user authorization - notify for incremental sync
        if self.connector_callback:
            await self.connector_callback(
                "dm_message",
                {
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "team_id": event.team_id,
                },
            )

    async def _handle_channel_event(self, event: SlackEvent) -> None:
        """Handle channel creation/deletion/archive events."""
        event_data = event.event or {}
        event_type = event.event_type

        if event_type == SlackEventType.CHANNEL_CREATED.value:
            channel = event_data.get("channel", {})
            channel_id = channel.get("id")
            channel_name = channel.get("name")
            logger.info(f"Channel created: {channel_name} ({channel_id})")

        elif event_type == SlackEventType.CHANNEL_DELETED.value:
            channel_id = event_data.get("channel")
            logger.info(f"Channel deleted: {channel_id}")

        elif event_type == SlackEventType.CHANNEL_ARCHIVE.value:
            channel_id = event_data.get("channel")
            logger.info(f"Channel archived: {channel_id}")

        elif event_type == SlackEventType.CHANNEL_UNARCHIVE.value:
            channel_id = event_data.get("channel")
            logger.info(f"Channel unarchived: {channel_id}")

        elif event_type == SlackEventType.CHANNEL_RENAME.value:
            channel = event_data.get("channel", {})
            channel_id = channel.get("id")
            new_name = channel.get("name")
            logger.info(f"Channel renamed: {channel_id} -> {new_name}")

        # Notify connector to update channel data
        if self.connector_callback:
            await self.connector_callback(
                "channel",
                {
                    "event_type": event_type,
                    "channel_id": event_data.get("channel")
                    or event_data.get("channel", {}).get("id"),
                    "team_id": event.team_id,
                },
            )

    async def _handle_member_event(self, event: SlackEvent) -> None:
        """Handle member join/leave events."""
        event_data = event.event or {}
        event_type = event.event_type

        channel_id = event_data.get("channel")
        user_id = event_data.get("user")

        if event_type == SlackEventType.MEMBER_JOINED_CHANNEL.value:
            logger.info(f"User {user_id} joined channel {channel_id}")
        elif event_type == SlackEventType.MEMBER_LEFT_CHANNEL.value:
            logger.info(f"User {user_id} left channel {channel_id}")

        # Notify connector to update permissions
        if self.connector_callback:
            await self.connector_callback(
                "member",
                {
                    "event_type": event_type,
                    "channel_id": channel_id,
                    "user_id": user_id,
                    "team_id": event.team_id,
                },
            )

    async def _handle_user_event(self, event: SlackEvent) -> None:
        """Handle user change/join events."""
        event_data = event.event or {}
        event_type = event.event_type

        if event_type == SlackEventType.TEAM_JOIN.value:
            user = event_data.get("user", {})
            user_id = user.get("id")
            user_name = user.get("name")
            logger.info(f"New user joined: {user_name} ({user_id})")

        elif event_type == SlackEventType.USER_CHANGE.value:
            user = event_data.get("user", {})
            user_id = user.get("id")
            logger.info(f"User updated: {user_id}")

        # Notify connector to update user data
        if self.connector_callback:
            await self.connector_callback(
                "user",
                {
                    "event_type": event_type,
                    "user_id": event_data.get("user", {}).get("id"),
                    "team_id": event.team_id,
                },
            )

    async def _handle_file_event(self, event: SlackEvent) -> None:
        """Handle file share/delete events."""
        event_data = event.event or {}
        event_type = event.event_type

        file_id = event_data.get("file_id") or event_data.get("file", {}).get("id")

        if event_type == SlackEventType.FILE_SHARED.value:
            logger.info(f"File shared: {file_id}")
        elif event_type == SlackEventType.FILE_DELETED.value:
            logger.info(f"File deleted: {file_id}")

        # Notify connector to process file
        if self.connector_callback:
            await self.connector_callback(
                "file",
                {
                    "event_type": event_type,
                    "file_id": file_id,
                    "team_id": event.team_id,
                },
            )


async def create_slack_webhook_endpoint(
    request: Request,
    signing_secret: str,
    connector_callback: Optional[callable] = None,
) -> JSONResponse:
    """
    FastAPI endpoint handler for Slack webhooks.

    Usage in router:
    ```python
    @router.post("/api/v1/connectors/slack/webhook")
    async def slack_webhook(request: Request):
        signing_secret = await get_signing_secret()
        return await create_slack_webhook_endpoint(request, signing_secret)
    ```

    Args:
        request: FastAPI request object
        signing_secret: Slack signing secret
        connector_callback: Optional callback for event processing

    Returns:
        JSONResponse with appropriate status
    """
    # Get required headers
    timestamp = request.headers.get("X-Slack-Request-Timestamp", "")
    signature = request.headers.get("X-Slack-Signature", "")

    # Get request body
    body = await request.body()

    # Create handler and verify request
    handler = SlackWebhookHandler(signing_secret, connector_callback)

    if not handler.verify_request(timestamp, body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Parse event
    import json

    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = SlackEvent.from_request(data)

    # Handle event
    result = await handler.handle_event(event)

    return JSONResponse(content=result)




