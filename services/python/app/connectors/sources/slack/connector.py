"""
Slack Connector for crawling and indexing Slack messages, channels, and files.

This connector implements RBAC-aware syncing:
1. Users are synced as AppUser for permission edges
2. Channels are synced as AppUserGroup with memberships
3. Messages are synced with proper permissions based on channel type
4. DMs are synced using user-specific tokens (if authorized)
"""

import hashlib
import uuid
from dataclasses import dataclass
from logging import Logger
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from fastapi.responses import StreamingResponse

from app.connectors.core.base.connector.connector_service import BaseConnector
from app.connectors.core.base.data_processor.data_source_entities_processor import (
    DataSourceEntitiesProcessor,
)
from app.connectors.core.base.data_store.data_store import DataStoreProvider
from app.connectors.core.registry.connector_builder import (
    AuthField,
    CommonFields,
    ConnectorBuilder,
    CustomField,
    DocumentationLink,
)
from app.connectors.sources.slack.apps import SlackApp
from app.connectors.sources.slack.user_auth_service import (
    SlackUserAuthService,
    SlackUserToken,
)
from app.models.entities import (
    AppUser,
    AppUserGroup,
    FileRecord,
    Record,
    RecordGroupType,
    RecordType,
)
from app.models.permission import EntityType, Permission, PermissionType
from app.sources.client.slack.slack import SlackClient, SlackRESTClientViaToken
from app.sources.external.slack.slack import SlackDataSource
from libs.core.config import ConfigurationService, KeyValueStore
from libs.core.constants import Connectors, HttpStatusCode, MimeTypes, OriginTypes
from libs.core.utils import get_epoch_timestamp_in_ms


@dataclass
class SlackChannel:
    """Represents a Slack channel with its metadata."""
    id: str
    name: str
    is_private: bool
    is_im: bool
    is_mpim: bool
    is_archived: bool
    created: int
    topic: Optional[str] = None
    purpose: Optional[str] = None


@dataclass
class SlackUser:
    """Represents a Slack user with their metadata."""
    id: str
    email: Optional[str]
    name: str
    real_name: Optional[str]
    is_bot: bool
    is_deleted: bool


# Slack OAuth Scopes
# Bot Scopes - for workspace-level access (public/private channels, users, files)
SLACK_BOT_SCOPES = [
    "channels:read",       # List public channels
    "channels:history",    # Read public channel messages
    "channels:join",       # Auto-join public channels for crawling
    "groups:read",         # List private channels
    "groups:history",      # Read private channel messages
    "users:read",          # List workspace users
    "users:read.email",    # Access user email addresses (required for RBAC)
    "files:read",          # List and access shared files
    "team:read",           # Read workspace info
]

# User Scopes - for DM access (requires individual user authorization)
SLACK_USER_SCOPES = [
    "im:read",             # List direct messages
    "im:history",          # Read direct message content
    "mpim:read",           # List multi-person direct messages
    "mpim:history",        # Read multi-person DM content
]

# Combined scopes for OAuth flow
SLACK_OAUTH_SCOPES = SLACK_BOT_SCOPES + SLACK_USER_SCOPES

SLACK_SCOPES_DESCRIPTION = """OAuth Scopes:
Bot Scopes (workspace access):
• channels:read, channels:history, channels:join (Public channels)
• groups:read, groups:history (Private channels)
• users:read, users:read.email (User info for RBAC)
• files:read (Shared files)
• team:read (Workspace info)

User Scopes (DM access - requires user authorization):
• im:read, im:history (Direct messages)
• mpim:read, mpim:history (Group DMs)"""


@ConnectorBuilder("Slack")\
    .in_group("Slack")\
    .with_auth_type("OAUTH")\
    .with_description("Sync messages, channels, and files from Slack")\
    .with_categories(["Messaging"])\
    .configure(lambda builder: builder
        .with_icon("/assets/icons/connectors/slack.svg")
        .with_realtime_support(True)
        .add_documentation_link(DocumentationLink(
            "Slack App Setup",
            "https://api.slack.com/apps",
            "setup"
        ))
        .add_documentation_link(DocumentationLink(
            "OAuth Scopes Reference",
            "https://api.slack.com/scopes",
            "scopes"
        ))
        .add_documentation_link(DocumentationLink(
            'Thero Documentation',
            'https://docs.thero.com/connectors/slack/slack',
            'thero'
        ))
        .with_redirect_uri("connectors/oauth/callback/Slack", True)
        .with_oauth_urls(
            "https://slack.com/oauth/v2/authorize",
            "https://slack.com/api/oauth.v2.access",
            SLACK_OAUTH_SCOPES
        )
        .add_auth_field(CommonFields.client_id("Slack App Console"))
        .add_auth_field(CommonFields.client_secret("Slack App Console"))
        .add_auth_field(AuthField(
            name="signingSecret",
            display_name="Signing Secret",
            placeholder="Enter your Signing Secret",
            description="The Signing Secret from your Slack App's Basic Information page. "
                        "Used to verify webhook requests from Slack.",
            field_type="PASSWORD",
            is_secret=True,
            required=False
        ))
        .with_webhook_config(True, ["message", "channel_created", "member_joined_channel", "file_shared"])
        .with_sync_strategies(["SCHEDULED", "MANUAL", "REALTIME"])
        .with_scheduled_config(True, 60)
        .add_sync_custom_field(CustomField(
            name="workspaceId",
            display_name="Workspace ID",
            field_type="TEXT",
            required=False,
            description="Your Slack Workspace ID (starts with T...). "
                        "Find it in your Slack URL: app.slack.com/client/TXXXXXXXX"
        ))
        .add_filter_field(CommonFields.channels_filter(),
                          "https://slack.com/api/conversations.list")
    )\
    .build_decorator()
class SlackConnector(BaseConnector):
    """
    Slack connector for crawling and indexing messages, channels, and files.

    Features:
    - RBAC-aware permission sync (Users, Channels as Groups)
    - Public/Private channel support
    - Direct message support with user-specific tokens
    - Thread message support
    - File attachment indexing
    """

    def __init__(
        self,
        logger: Logger,
        data_entities_processor: DataSourceEntitiesProcessor,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
        key_value_store: Optional[KeyValueStore] = None,
    ) -> None:
        super().__init__(
            SlackApp(),
            logger,
            data_entities_processor,
            data_store_provider,
            config_service
        )
        self.connector_name = Connectors.SLACK
        self.key_value_store = key_value_store

        # Slack client and data source (for bot/workspace access)
        self.slack_client: Optional[SlackClient] = None
        self.data_source: Optional[SlackDataSource] = None

        # User auth service for DM access
        self.user_auth_service: Optional[SlackUserAuthService] = None

        # User-specific data sources for DM crawling
        # Maps: thero_user_id -> SlackDataSource with user token
        self._user_data_sources: Dict[str, SlackDataSource] = {}

        # Configuration
        self.batch_size = 100
        self.max_messages_per_channel = 1000
        self._is_initialized = False

        # OAuth credentials (stored for user auth service)
        self.client_id: Optional[str] = None
        self.client_secret: Optional[str] = None
        self.signing_secret: Optional[str] = None

        # Cached data for permission mapping
        self._user_cache: Dict[str, SlackUser] = {}
        self._user_email_map: Dict[str, str] = {}  # slack_user_id -> email
        self._email_user_map: Dict[str, str] = {}  # email -> slack_user_id
        self._channel_cache: Dict[str, SlackChannel] = {}
        self._channel_members_cache: Dict[str, List[str]] = {}  # channel_id -> [user_ids]

    async def init(self) -> bool:
        """Initialize the Slack connector with OAuth configuration."""
        try:
            config = await self.config_service.get_config(
                "/services/connectors/slack/config"
            )
            if not config:
                self.logger.error("Slack configuration not found.")
                return False

            # Get OAuth credentials
            credentials_config = config.get("credentials") or {}
            access_token = credentials_config.get("access_token")

            if not access_token:
                self.logger.error("Slack access token not found in configuration.")
                return False

            # Store OAuth credentials for user auth service
            auth_config = config.get("auth") or {}
            self.client_id = auth_config.get("clientId")
            self.client_secret = auth_config.get("clientSecret")
            self.signing_secret = auth_config.get("signingSecret")
            self.refresh_token = credentials_config.get("refresh_token")

            # Initialize Slack client with OAuth token
            rest_client = SlackRESTClientViaToken(access_token)
            self.slack_client = SlackClient(rest_client)
            self.data_source = SlackDataSource(self.slack_client)

            # Initialize user auth service for DM access (if credentials available)
            if self.client_id and self.client_secret and self.key_value_store:
                self.user_auth_service = SlackUserAuthService(
                    client_id=self.client_id,
                    client_secret=self.client_secret,
                    redirect_uri="",  # Will be set dynamically
                    key_value_store=self.key_value_store,
                    arango_service=self.data_entities_processor.arango_service,
                    org_id=self.data_entities_processor.org_id,
                )
                self.logger.info("User auth service initialized for DM access.")
            else:
                self.logger.warning(
                    "User auth service not initialized - "
                    "DM crawling will require individual user authorization."
                )

            self._is_initialized = True
            self.logger.info("Slack connector initialized successfully with OAuth.")
            return True

        except Exception as e:
            self.logger.error(f"Failed to initialize Slack connector: {e}", exc_info=True)
            return False

    async def test_connection_and_access(self) -> bool:
        """Test the connection to Slack by calling auth.test."""
        if not self.data_source:
            self.logger.error("Slack data source not initialized")
            return False

        try:
            response = await self.data_source.check_token_scopes()
            if response.success:
                self.logger.info("Slack connection test successful.")
                return True
            else:
                self.logger.error(f"Slack connection test failed: {response.error}")
                return False

        except Exception as e:
            self.logger.error(f"Slack connection test failed: {e}", exc_info=True)
            return False

    async def run_sync(self) -> None:
        """
        Run full synchronization from Slack.

        Sync order (important for RBAC):
        1. Users - Required for permission edges
        2. Channels as Groups - Required for group permissions
        3. Auto-join channels - Required for message access
        4. Messages from public/private channels - With bot token
        5. DM/MPDM messages - With user tokens (if authorized)
        6. Files - With channel-based permissions
        """
        if not self._is_initialized:
            self.logger.error("Slack connector not initialized. Cannot run sync.")
            return

        try:
            self.logger.info("Starting Slack full sync.")

            # Step 1: Sync all users (RBAC requirement)
            self.logger.info("Step 1: Syncing users...")
            await self._sync_users()

            # Step 2: Sync channels as user groups (RBAC requirement)
            self.logger.info("Step 2: Syncing channels as groups...")
            await self._sync_channels_as_groups()

            # Step 3: Auto-join all public channels (required for message access)
            self.logger.info("Step 3: Auto-joining channels...")
            await self._auto_join_channels()

            # Step 4: Sync messages from public/private channels (bot token)
            self.logger.info("Step 4: Syncing channel messages...")
            await self._sync_channel_messages()

            # Step 5: Sync DM/MPDM messages (user tokens)
            self.logger.info("Step 5: Syncing DM messages with user tokens...")
            await self._sync_dm_messages_with_user_tokens()

            # Step 6: Sync files
            self.logger.info("Step 6: Syncing files...")
            await self._sync_files()

            self.logger.info("Slack full sync completed.")

        except Exception as ex:
            self.logger.error(f"Error in Slack connector sync: {ex}", exc_info=True)
            raise

    # ========================== Auto-Join Channels ==========================

    async def _auto_join_channels(self) -> None:
        """
        Automatically join all public channels to enable message crawling.
        Requires the 'channels:join' scope.
        """
        self.logger.info("Auto-joining public channels...")
        joined_count = 0
        failed_count = 0

        for channel_id, channel in self._channel_cache.items():
            # Only join public channels (not private, DMs, or MPDMs)
            # Private channels require explicit invitation
            if channel.is_private or channel.is_im or channel.is_mpim:
                continue

            if channel.is_archived:
                self.logger.debug(f"Skipping archived channel: {channel.name}")
                continue

            try:
                response = await self.data_source.conversations_join(channel=channel_id)

                if response.success:
                    joined_count += 1
                    self.logger.debug(f"Joined channel: {channel.name}")
                elif response.error and "already_in_channel" in str(response.error).lower():
                    # Already in channel - this is fine
                    joined_count += 1
                else:
                    failed_count += 1
                    self.logger.warning(
                        f"Failed to join channel {channel.name}: {response.error}"
                    )
            except Exception as e:
                failed_count += 1
                self.logger.warning(f"Error joining channel {channel.name}: {e}")

        self.logger.info(
            f"Auto-join completed: {joined_count} channels joined, {failed_count} failed"
        )

    # ========================== User Sync (RBAC) ==========================

    async def _sync_users(self) -> None:
        """
        Sync all Slack workspace users as AppUser.
        This is required for RBAC permission edges.
        """
        self.logger.info("Starting Slack user sync...")

        all_users: List[AppUser] = []
        cursor: Optional[str] = None

        while True:
            response = await self.data_source.users_list(
                limit=self.batch_size,
                cursor=cursor
            )

            if not response.success:
                self.logger.error(f"Failed to fetch users: {response.error}")
                break

            data = response.data or {}
            members = data.get("members", [])

            for member in members:
                # Skip bots and deleted users for permission purposes
                is_bot = member.get("is_bot", False)
                is_deleted = member.get("deleted", False)

                user_id = member.get("id", "")
                profile = member.get("profile", {})
                email = profile.get("email", "")
                real_name = profile.get("real_name_normalized") or member.get("real_name", "")
                display_name = profile.get("display_name", "") or member.get("name", "")

                # Cache user for later use
                slack_user = SlackUser(
                    id=user_id,
                    email=email,
                    name=display_name,
                    real_name=real_name,
                    is_bot=is_bot,
                    is_deleted=is_deleted
                )
                self._user_cache[user_id] = slack_user

                if email:
                    self._user_email_map[user_id] = email

                # Only create AppUser for non-bot, non-deleted users with email
                if not is_bot and not is_deleted and email:
                    app_user = AppUser(
                        app_name=self.connector_name,
                        source_user_id=user_id,
                        email=email,
                        full_name=real_name or display_name,
                        is_active=True
                    )
                    all_users.append(app_user)

            # Check for pagination
            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        if all_users:
            await self.data_entities_processor.on_new_app_users(all_users)
            self.logger.info(f"Synced {len(all_users)} users from Slack.")
        else:
            self.logger.warning("No users found to sync from Slack.")

    # ========================== Channel Sync as Groups (RBAC) ==========================

    async def _sync_channels_as_groups(self) -> None:
        """
        Sync all Slack channels as AppUserGroup with memberships.
        This is required for RBAC group permissions.
        """
        self.logger.info("Starting Slack channel sync as groups...")

        # Fetch all channels (public, private, mpim, im)
        channels = await self._fetch_all_channels()

        user_groups_with_members: List[Tuple[AppUserGroup, List[AppUser]]] = []

        for channel in channels:
            self._channel_cache[channel.id] = channel

            # Create AppUserGroup for the channel
            user_group = AppUserGroup(
                app_name=self.connector_name,
                source_user_group_id=channel.id,
                name=channel.name,
                source_created_at=channel.created * 1000 if channel.created else None
            )

            # Fetch channel members
            members = await self._fetch_channel_members(channel.id)
            self._channel_members_cache[channel.id] = members

            # Convert member IDs to AppUser objects
            member_app_users: List[AppUser] = []
            for member_id in members:
                if member_id in self._user_cache:
                    user = self._user_cache[member_id]
                    if user.email and not user.is_bot and not user.is_deleted:
                        member_app_users.append(AppUser(
                            app_name=self.connector_name,
                            source_user_id=user.id,
                            email=user.email,
                            full_name=user.real_name or user.name,
                            is_active=True
                        ))

            user_groups_with_members.append((user_group, member_app_users))

        if user_groups_with_members:
            await self.data_entities_processor.on_new_user_groups(user_groups_with_members)
            self.logger.info(f"Synced {len(user_groups_with_members)} channels as groups.")

    async def _fetch_all_channels(self) -> List[SlackChannel]:
        """Fetch all accessible channels from Slack."""
        all_channels: List[SlackChannel] = []
        cursor: Optional[str] = None

        # Fetch public, private, mpim, and im channels
        channel_types = "public_channel,private_channel,mpim,im"

        while True:
            response = await self.data_source.conversations_list(
                types=channel_types,
                exclude_archived=False,
                limit=self.batch_size,
                cursor=cursor
            )

            if not response.success:
                self.logger.error(f"Failed to fetch channels: {response.error}")
                break

            data = response.data or {}
            channels = data.get("channels", [])

            for ch in channels:
                channel = SlackChannel(
                    id=ch.get("id", ""),
                    name=ch.get("name", "") or self._get_dm_name(ch),
                    is_private=ch.get("is_private", False),
                    is_im=ch.get("is_im", False),
                    is_mpim=ch.get("is_mpim", False),
                    is_archived=ch.get("is_archived", False),
                    created=ch.get("created", 0),
                    topic=ch.get("topic", {}).get("value"),
                    purpose=ch.get("purpose", {}).get("value")
                )
                all_channels.append(channel)

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        self.logger.info(f"Fetched {len(all_channels)} channels from Slack.")
        return all_channels

    def _get_dm_name(self, channel: Dict) -> str:
        """Generate a name for DM/MPIM channels."""
        if channel.get("is_im"):
            user_id = channel.get("user", "")
            if user_id in self._user_cache:
                return f"DM with {self._user_cache[user_id].name}"
            return f"DM-{channel.get('id', 'unknown')}"
        elif channel.get("is_mpim"):
            return channel.get("name", f"Group-{channel.get('id', 'unknown')}")
        return channel.get("name", "unknown")

    async def _fetch_channel_members(self, channel_id: str) -> List[str]:
        """Fetch all members of a channel."""
        members: List[str] = []
        cursor: Optional[str] = None

        while True:
            response = await self.data_source.conversations_members(
                channel=channel_id,
                limit=self.batch_size,
                cursor=cursor
            )

            if not response.success:
                self.logger.warning(f"Failed to fetch members for channel {channel_id}: {response.error}")
                break

            data = response.data or {}
            members.extend(data.get("members", []))

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        return members

    # ========================== Message Sync ==========================

    async def _sync_channel_messages(self) -> None:
        """Sync messages from all channels with proper RBAC permissions."""
        self.logger.info("Starting Slack message sync...")

        total_messages = 0

        for channel_id, channel in self._channel_cache.items():
            if channel.is_archived:
                self.logger.info(f"Skipping archived channel: {channel.name}")
                continue

            messages_synced = await self._sync_messages_for_channel(channel)
            total_messages += messages_synced

        self.logger.info(f"Synced {total_messages} messages from Slack.")

    async def _sync_messages_for_channel(self, channel: SlackChannel) -> int:
        """Sync all messages from a specific channel."""
        self.logger.info(f"Syncing messages for channel: {channel.name} ({channel.id})")

        records_with_permissions: List[Tuple[Record, List[Permission]]] = []
        cursor: Optional[str] = None
        message_count = 0

        while message_count < self.max_messages_per_channel:
            response = await self.data_source.conversations_history(
                channel=channel.id,
                limit=min(self.batch_size, self.max_messages_per_channel - message_count),
                cursor=cursor
            )

            if not response.success:
                self.logger.warning(f"Failed to fetch messages for {channel.name}: {response.error}")
                break

            data = response.data or {}
            messages = data.get("messages", [])

            for msg in messages:
                record, permissions = self._create_message_record(msg, channel)
                if record:
                    records_with_permissions.append((record, permissions))
                    message_count += 1

                    # Also fetch thread replies if this message has them
                    thread_ts = msg.get("thread_ts")
                    reply_count = msg.get("reply_count", 0)

                    if thread_ts and reply_count > 0 and msg.get("ts") == thread_ts:
                        thread_records = await self._fetch_thread_replies(
                            channel, thread_ts, permissions
                        )
                        records_with_permissions.extend(thread_records)
                        message_count += len(thread_records)

            # Batch process records
            if len(records_with_permissions) >= self.batch_size:
                await self.data_entities_processor.on_new_records(records_with_permissions)
                records_with_permissions.clear()

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        # Process remaining records
        if records_with_permissions:
            await self.data_entities_processor.on_new_records(records_with_permissions)

        self.logger.info(f"Synced {message_count} messages from channel: {channel.name}")
        return message_count

    async def _fetch_thread_replies(
        self,
        channel: SlackChannel,
        thread_ts: str,
        parent_permissions: List[Permission]
    ) -> List[Tuple[Record, List[Permission]]]:
        """Fetch all replies in a thread."""
        replies: List[Tuple[Record, List[Permission]]] = []
        cursor: Optional[str] = None

        while True:
            response = await self.data_source.conversations_replies(
                channel=channel.id,
                ts=thread_ts,
                limit=self.batch_size,
                cursor=cursor
            )

            if not response.success:
                break

            data = response.data or {}
            messages = data.get("messages", [])

            for msg in messages:
                # Skip the parent message (already processed)
                if msg.get("ts") == thread_ts and msg.get("thread_ts") == thread_ts:
                    continue

                record, _ = self._create_message_record(msg, channel, parent_thread_ts=thread_ts)
                if record:
                    replies.append((record, parent_permissions))

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        return replies

    def _create_message_record(
        self,
        message: Dict[str, Any],
        channel: SlackChannel,
        parent_thread_ts: Optional[str] = None
    ) -> Tuple[Optional[FileRecord], List[Permission]]:
        """Create a FileRecord from a Slack message with proper RBAC permissions."""
        try:
            msg_ts = message.get("ts", "")
            msg_text = message.get("text", "")
            user_id = message.get("user", "")

            if not msg_ts or not msg_text:
                return None, []

            # Generate unique ID
            record_id = str(uuid.uuid4())
            external_id = f"{channel.id}/{msg_ts}"

            # Get user info
            user_name = "Unknown"
            if user_id in self._user_cache:
                user = self._user_cache[user_id]
                user_name = user.real_name or user.name

            # Create record name
            record_name = f"{user_name}: {msg_text[:100]}..." if len(msg_text) > 100 else f"{user_name}: {msg_text}"

            # Calculate timestamps
            ts_float = float(msg_ts)
            timestamp_ms = int(ts_float * 1000)

            # Create MD5 hash of content
            content_hash = hashlib.md5(msg_text.encode()).hexdigest()

            # Create FileRecord
            record = FileRecord(
                id=record_id,
                record_name=record_name,
                record_type=RecordType.MESSAGE,
                record_group_type=RecordGroupType.SLACK_CHANNEL,
                external_record_id=external_id,
                external_revision_id=content_hash,
                external_record_group_id=channel.id,
                parent_external_record_id=f"{channel.id}/{parent_thread_ts}" if parent_thread_ts else None,
                version=0,
                origin=OriginTypes.CONNECTOR,
                connector_name=self.connector_name,
                created_at=get_epoch_timestamp_in_ms(),
                updated_at=get_epoch_timestamp_in_ms(),
                source_created_at=timestamp_ms,
                source_updated_at=timestamp_ms,
                is_file=False,
                size_in_bytes=len(msg_text.encode()),
                mime_type=MimeTypes.PLAIN_TEXT.value,
                inherit_permissions=True,  # Inherit from channel group
            )

            # Create permissions based on channel type
            permissions = self._create_channel_permissions(channel)

            return record, permissions

        except Exception as e:
            self.logger.error(f"Error creating message record: {e}", exc_info=True)
            return None, []

    def _create_channel_permissions(self, channel: SlackChannel) -> List[Permission]:
        """
        Create RBAC permissions based on channel type.

        - Public channels: All channel members via GROUP permission
        - Private channels: Only channel members via GROUP permission
        - DMs/MPDMs: Direct USER permissions for participants
        """
        permissions: List[Permission] = []

        if channel.is_im or channel.is_mpim:
            # DM/MPDM: Create direct USER permissions for each participant
            members = self._channel_members_cache.get(channel.id, [])
            for member_id in members:
                if member_id in self._user_email_map:
                    email = self._user_email_map[member_id]
                    permissions.append(Permission(
                        external_id=member_id,
                        email=email,
                        type=PermissionType.READ,
                        entity_type=EntityType.USER
                    ))
        else:
            # Public/Private channel: Use GROUP permission
            # The channel is already synced as a group with members
            permissions.append(Permission(
                external_id=channel.id,
                type=PermissionType.READ,
                entity_type=EntityType.GROUP
            ))

        return permissions

    # ========================== DM Sync with User Tokens ==========================

    async def _sync_dm_messages_with_user_tokens(self) -> None:
        """
        Sync DM and MPDM messages using individual user tokens.

        Each user who has authorized the app can have their DMs synced.
        Messages are only visible to the user who authorized access.
        """
        if not self.user_auth_service:
            self.logger.info("User auth service not available - skipping DM sync.")
            return

        try:
            # Get all authorized users
            authorized_users = await self.user_auth_service.get_all_authorized_users()

            if not authorized_users:
                self.logger.info("No users have authorized DM access - skipping DM sync.")
                return

            self.logger.info(
                f"Syncing DMs for {len(authorized_users)} authorized users."
            )

            for user_token in authorized_users:
                await self._sync_user_dms(user_token)

        except Exception as e:
            self.logger.error(f"Error syncing DMs with user tokens: {e}", exc_info=True)

    async def _sync_user_dms(self, user_token: SlackUserToken) -> None:
        """
        Sync DMs for a specific user using their token.

        Args:
            user_token: SlackUserToken for the authorized user
        """
        try:
            # Check if token is still valid
            if user_token.is_expired:
                self.logger.warning(
                    f"Token expired for user {user_token.user_id} - "
                    "attempting refresh..."
                )
                refreshed = await self.user_auth_service.refresh_user_token(
                    user_token.user_id
                )
                if not refreshed:
                    self.logger.error(
                        f"Failed to refresh token for user {user_token.user_id}"
                    )
                    return
                user_token = refreshed

            # Create user-specific data source
            user_rest_client = SlackRESTClientViaToken(user_token.access_token)
            user_slack_client = SlackClient(user_rest_client)
            user_data_source = SlackDataSource(user_slack_client)

            self.logger.info(
                f"Syncing DMs for user {user_token.user_id} "
                f"(Slack user: {user_token.slack_user_id})"
            )

            # Get DM channels for this user
            dm_channels = await self._get_user_dm_channels(user_data_source)

            total_messages = 0
            for dm_channel in dm_channels:
                messages_synced = await self._sync_user_dm_messages(
                    user_data_source,
                    dm_channel,
                    user_token,
                )
                total_messages += messages_synced

            self.logger.info(
                f"Synced {total_messages} DM messages for user {user_token.user_id}"
            )

        except Exception as e:
            self.logger.error(
                f"Error syncing DMs for user {user_token.user_id}: {e}",
                exc_info=True
            )

    async def _get_user_dm_channels(
        self, user_data_source: SlackDataSource
    ) -> List[SlackChannel]:
        """
        Get DM and MPDM channels accessible by a user's token.

        Args:
            user_data_source: SlackDataSource initialized with user token

        Returns:
            List of DM/MPDM SlackChannels
        """
        dm_channels: List[SlackChannel] = []
        cursor: Optional[str] = None

        while True:
            # Get DMs and MPDMs
            response = await user_data_source.conversations_list(
                types="im,mpim",
                limit=self.batch_size,
                cursor=cursor
            )

            if not response.success:
                self.logger.warning(
                    f"Failed to fetch DM channels: {response.error}"
                )
                break

            data = response.data or {}
            channels = data.get("channels", [])

            for channel in channels:
                dm_channel = SlackChannel(
                    id=channel.get("id", ""),
                    name=self._get_dm_name(channel),
                    is_private=True,
                    is_im=channel.get("is_im", False),
                    is_mpim=channel.get("is_mpim", False),
                    is_archived=channel.get("is_archived", False),
                    created=channel.get("created", 0),
                )
                dm_channels.append(dm_channel)

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        return dm_channels

    async def _sync_user_dm_messages(
        self,
        user_data_source: SlackDataSource,
        dm_channel: SlackChannel,
        user_token: SlackUserToken,
    ) -> int:
        """
        Sync messages from a DM channel using user's token.

        Args:
            user_data_source: SlackDataSource with user token
            dm_channel: The DM/MPDM channel to sync
            user_token: The user's token for permission assignment

        Returns:
            Number of messages synced
        """
        if dm_channel.is_archived:
            return 0

        records_with_permissions: List[Tuple[Record, List[Permission]]] = []
        cursor: Optional[str] = None
        message_count = 0

        while message_count < self.max_messages_per_channel:
            response = await user_data_source.conversations_history(
                channel=dm_channel.id,
                limit=min(self.batch_size, self.max_messages_per_channel - message_count),
                cursor=cursor
            )

            if not response.success:
                self.logger.warning(
                    f"Failed to fetch DM messages for {dm_channel.name}: "
                    f"{response.error}"
                )
                break

            data = response.data or {}
            messages = data.get("messages", [])

            for msg in messages:
                record, permissions = self._create_dm_message_record(
                    msg, dm_channel, user_token
                )
                if record:
                    records_with_permissions.append((record, permissions))
                    message_count += 1

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        # Persist records with permissions
        if records_with_permissions:
            await self.data_entities_processor.on_new_records(
                records_with_permissions
            )

        return message_count

    def _create_dm_message_record(
        self,
        message: Dict,
        dm_channel: SlackChannel,
        user_token: SlackUserToken,
    ) -> Tuple[Optional[Record], List[Permission]]:
        """
        Create a record for a DM message with user-specific permissions.

        DM messages are only accessible by the user who authorized access.

        Args:
            message: Slack message data
            dm_channel: The DM channel
            user_token: The user's token

        Returns:
            Tuple of (Record, List[Permission])
        """
        msg_ts = message.get("ts", "")
        msg_text = message.get("text", "")
        msg_user = message.get("user", "")

        if not msg_ts or not msg_text:
            return None, []

        # Get sender info
        sender_name = "Unknown"
        if msg_user in self._user_cache:
            sender_name = self._user_cache[msg_user].name

        # Create title from message preview
        title = f"{sender_name}: {msg_text[:100]}..." if len(msg_text) > 100 else f"{sender_name}: {msg_text}"

        # Calculate timestamps
        ts_float = float(msg_ts)
        timestamp_ms = int(ts_float * 1000)

        # Create MD5 hash of content
        content_hash = hashlib.md5(msg_text.encode()).hexdigest()

        # Create record
        record = FileRecord(
            id=str(uuid.uuid4()),
            record_name=title,
            record_type=RecordType.MESSAGE,
            record_group_type=RecordGroupType.SLACK_CHANNEL,
            external_record_id=f"{dm_channel.id}/{msg_ts}",
            external_revision_id=content_hash,
            external_record_group_id=dm_channel.id,
            version=0,
            origin=OriginTypes.CONNECTOR,
            connector_name=self.connector_name,
            created_at=get_epoch_timestamp_in_ms(),
            updated_at=get_epoch_timestamp_in_ms(),
            source_created_at=timestamp_ms,
            source_updated_at=timestamp_ms,
            weburl=f"https://slack.com/archives/{dm_channel.id}/p{msg_ts.replace('.', '')}",
            mime_type=MimeTypes.PLAIN_TEXT.value,
            is_file=False,
            size_in_bytes=len(msg_text.encode()),
            inherit_permissions=False,  # DMs don't inherit from channel group
        )

        # Create user-specific permission
        # DM messages are only accessible by the user who authorized access
        user_email = None
        if user_token.slack_user_id in self._user_email_map:
            user_email = self._user_email_map[user_token.slack_user_id]

        permissions = [
            Permission(
                external_id=user_token.slack_user_id,
                email=user_email,
                type=PermissionType.READ,
                entity_type=EntityType.USER
            )
        ]

        return record, permissions

    # ========================== File Sync ==========================

    async def _sync_files(self) -> None:
        """Sync files shared in Slack with channel-based permissions."""
        self.logger.info("Starting Slack file sync...")

        records_with_permissions: List[Tuple[Record, List[Permission]]] = []
        page = 1
        total_files = 0

        while True:
            response = await self.data_source.files_list(
                count=self.batch_size,
                page=page
            )

            if not response.success:
                self.logger.warning(f"Failed to fetch files: {response.error}")
                break

            data = response.data or {}
            files = data.get("files", [])

            if not files:
                break

            for file_info in files:
                record, permissions = self._create_file_record(file_info)
                if record:
                    records_with_permissions.append((record, permissions))
                    total_files += 1

            # Batch process
            if len(records_with_permissions) >= self.batch_size:
                await self.data_entities_processor.on_new_records(records_with_permissions)
                records_with_permissions.clear()

            paging = data.get("paging", {})
            if page >= paging.get("pages", 1):
                break

            page += 1

        # Process remaining
        if records_with_permissions:
            await self.data_entities_processor.on_new_records(records_with_permissions)

        self.logger.info(f"Synced {total_files} files from Slack.")

    def _create_file_record(
        self,
        file_info: Dict[str, Any]
    ) -> Tuple[Optional[FileRecord], List[Permission]]:
        """Create a FileRecord from a Slack file with proper permissions."""
        try:
            file_id = file_info.get("id", "")
            file_name = file_info.get("name", "Untitled")
            file_type = file_info.get("filetype", "")
            mime_type = file_info.get("mimetype", MimeTypes.BIN.value)
            size = file_info.get("size", 0)
            created = file_info.get("created", 0)
            url_private = file_info.get("url_private", "")

            if not file_id:
                return None, []

            # Get channels where the file is shared
            channels = file_info.get("channels", [])
            groups = file_info.get("groups", [])  # Private channels
            ims = file_info.get("ims", [])  # Direct messages

            all_channel_ids = channels + groups + ims

            # Use first channel as the record group
            record_group_id = all_channel_ids[0] if all_channel_ids else None

            record_id = str(uuid.uuid4())
            timestamp_ms = created * 1000 if created else get_epoch_timestamp_in_ms()

            record = FileRecord(
                id=record_id,
                record_name=file_name,
                record_type=RecordType.FILE,
                record_group_type=RecordGroupType.SLACK_CHANNEL,
                external_record_id=file_id,
                external_revision_id=str(file_info.get("timestamp", created)),
                external_record_group_id=record_group_id,
                version=0,
                origin=OriginTypes.CONNECTOR,
                connector_name=self.connector_name,
                created_at=get_epoch_timestamp_in_ms(),
                updated_at=get_epoch_timestamp_in_ms(),
                source_created_at=timestamp_ms,
                source_updated_at=timestamp_ms,
                weburl=url_private,
                is_file=True,
                size_in_bytes=size,
                extension=file_type,
                mime_type=mime_type,
            )

            # Create permissions based on all channels the file is shared in
            permissions: List[Permission] = []
            for channel_id in all_channel_ids:
                if channel_id in self._channel_cache:
                    channel = self._channel_cache[channel_id]
                    channel_perms = self._create_channel_permissions(channel)
                    permissions.extend(channel_perms)

            # Deduplicate permissions
            seen = set()
            unique_permissions = []
            for perm in permissions:
                key = (perm.external_id, perm.entity_type)
                if key not in seen:
                    seen.add(key)
                    unique_permissions.append(perm)

            return record, unique_permissions

        except Exception as e:
            self.logger.error(f"Error creating file record: {e}", exc_info=True)
            return None, []

    # ========================== Required Abstract Methods ==========================

    async def get_signed_url(self, record: Record) -> Optional[str]:
        """Return the web URL for the record."""
        return record.weburl

    async def stream_record(self, record: Record) -> StreamingResponse:
        """Stream record content - not implemented for Slack messages."""
        raise HTTPException(
            status_code=HttpStatusCode.NOT_IMPLEMENTED.value,
            detail="Streaming not supported for Slack records"
        )

    async def handle_webhook_notification(self, notification: Dict) -> None:
        """Handle webhook notifications - not implemented yet."""
        self.logger.warning("Webhook handling not implemented for Slack connector")

    async def cleanup(self) -> None:
        """Cleanup resources."""
        self._user_cache.clear()
        self._user_email_map.clear()
        self._channel_cache.clear()
        self._channel_members_cache.clear()
        self.logger.info("Slack connector cleanup completed.")

    async def reindex_records(self, record_results: List[Record]) -> None:
        """Reindex existing records."""
        if record_results:
            await self.data_entities_processor.reindex_existing_records(record_results)

    async def run_incremental_sync(self) -> None:
        """Run incremental sync - currently runs full sync."""
        # TODO: Implement incremental sync using Slack's history endpoints
        await self.run_sync()

    @classmethod
    async def create_connector(
        cls,
        logger: Logger,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
        **kwargs
    ) -> "SlackConnector":
        """Factory method to create a SlackConnector instance."""
        data_entities_processor = DataSourceEntitiesProcessor(
            logger, data_store_provider, config_service
        )
        await data_entities_processor.initialize()
        key_value_store = kwargs.get("key_value_store")
        return cls(
            logger, data_entities_processor, data_store_provider, config_service, key_value_store
        )
