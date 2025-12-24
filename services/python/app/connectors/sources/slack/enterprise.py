"""
Slack Enterprise Grid Connector

Supports organization-wide deployment across multiple workspaces.
Requires Enterprise Grid subscription and admin privileges.

Enterprise-specific features:
- Org-wide app installation
- Multi-workspace crawling
- Admin API access for comprehensive data
"""

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

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
from app.connectors.sources.slack.connector import (
    SLACK_BOT_SCOPES,
    SLACK_USER_SCOPES,
    SlackConnector,
    SlackUser,
)
from app.sources.external.slack.slack import SlackDataSource
from libs.core.config import ConfigurationService, KeyValueStore
from libs.core.constants import Connectors

logger = logging.getLogger(__name__)


# Enterprise Grid specific scopes
SLACK_ENTERPRISE_SCOPES = SLACK_BOT_SCOPES + [
    "admin.teams:read",           # List all workspaces in the org
    "admin.users:read",           # List all users across workspaces
    "admin.conversations:read",   # Read conversations org-wide
]

# Combined enterprise + user scopes
SLACK_ENTERPRISE_OAUTH_SCOPES = SLACK_ENTERPRISE_SCOPES + SLACK_USER_SCOPES


@dataclass
class SlackWorkspace:
    """Represents a Slack workspace in an Enterprise Grid."""
    id: str
    name: str
    domain: str
    is_primary: bool = False
    is_verified: bool = False
    icon_url: Optional[str] = None


@ConnectorBuilder("SlackEnterprise")\
    .in_group("Slack")\
    .with_auth_type("OAUTH")\
    .with_description("Sync messages from Slack Enterprise Grid (multi-workspace)")\
    .with_categories(["Messaging", "Enterprise"])\
    .configure(lambda builder: builder
        .with_icon("/assets/icons/connectors/slack.svg")
        .with_realtime_support(True)
        .add_documentation_link(DocumentationLink(
            "Slack Enterprise Grid Setup",
            "https://api.slack.com/enterprise/grid",
            "setup"
        ))
        .add_documentation_link(DocumentationLink(
            "Enterprise Admin API",
            "https://api.slack.com/admins",
            "admin"
        ))
        .add_documentation_link(DocumentationLink(
            'Thero Documentation',
            'https://docs.thero.com/connectors/slack/enterprise',
            'thero'
        ))
        .with_redirect_uri("connectors/oauth/callback/SlackEnterprise", True)
        .with_oauth_urls(
            "https://slack.com/oauth/v2/authorize",
            "https://slack.com/api/oauth.v2.access",
            SLACK_ENTERPRISE_OAUTH_SCOPES
        )
        .add_auth_field(CommonFields.client_id("Slack App Console"))
        .add_auth_field(CommonFields.client_secret("Slack App Console"))
        .add_auth_field(AuthField(
            name="signingSecret",
            display_name="Signing Secret",
            placeholder="Enter your Signing Secret",
            description="The Signing Secret from your Slack App's Basic Information page.",
            field_type="PASSWORD",
            is_secret=True,
            required=False
        ))
        .add_auth_field(AuthField(
            name="enterpriseId",
            display_name="Enterprise ID",
            placeholder="E...",
            description="Your Slack Enterprise Grid ID (starts with E...). "
                        "Find it in your Slack URL: app.slack.com/client/EXXXXXXXX",
            field_type="TEXT",
            required=True
        ))
        .with_webhook_config(True, ["message", "channel_created", "member_joined_channel", "file_shared"])
        .with_sync_strategies(["SCHEDULED", "MANUAL", "REALTIME"])
        .with_scheduled_config(True, 120)  # Longer interval for enterprise
        .add_sync_custom_field(CustomField(
            name="syncAllWorkspaces",
            display_name="Sync All Workspaces",
            field_type="CHECKBOX",
            required=False,
            description="When enabled, syncs data from all workspaces in the organization.",
            default_value="true"
        ))
        .add_sync_custom_field(CustomField(
            name="selectedWorkspaces",
            display_name="Selected Workspaces",
            field_type="TEXT",
            required=False,
            description="Comma-separated list of workspace IDs to sync (leave empty for all)."
        ))
        .add_filter_field(CommonFields.channels_filter(),
                          "https://slack.com/api/admin.conversations.search")
    )\
    .build_decorator()
class SlackEnterpriseConnector(SlackConnector):
    """
    Slack Enterprise Grid connector for multi-workspace crawling.

    Extends SlackConnector with:
    - Multi-workspace support
    - Admin API access
    - Org-wide user and channel management
    """

    def __init__(
        self,
        logger_instance,
        data_entities_processor: DataSourceEntitiesProcessor,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
        key_value_store: Optional[KeyValueStore] = None,
    ) -> None:
        super().__init__(
            logger_instance,
            data_entities_processor,
            data_store_provider,
            config_service,
            key_value_store,
        )
        self.connector_name = Connectors.SLACK  # Use same connector constant

        # Enterprise-specific
        self.enterprise_id: Optional[str] = None
        self.workspaces: Dict[str, SlackWorkspace] = {}
        self.sync_all_workspaces: bool = True
        self.selected_workspace_ids: List[str] = []

        # Per-workspace data sources
        self._workspace_data_sources: Dict[str, SlackDataSource] = {}

    async def init(self) -> bool:
        """Initialize the Enterprise connector with org-wide configuration."""
        try:
            # Initialize base connector
            if not await super().init():
                return False

            # Get enterprise-specific config
            config = await self.config_service.get_config(
                "/services/connectors/slackenterprise/config"
            )
            if not config:
                self.logger.error("Slack Enterprise configuration not found.")
                return False

            auth_config = config.get("auth", {})
            sync_config = config.get("sync", {})

            # Enterprise ID
            self.enterprise_id = auth_config.get("enterpriseId")
            if not self.enterprise_id:
                self.logger.error("Enterprise ID not configured.")
                return False

            # Workspace filtering
            self.sync_all_workspaces = sync_config.get("syncAllWorkspaces", True)
            selected = sync_config.get("selectedWorkspaces", "")
            if selected:
                self.selected_workspace_ids = [
                    ws.strip() for ws in selected.split(",") if ws.strip()
                ]

            # Load workspaces
            await self._load_workspaces()

            self.logger.info(
                f"Slack Enterprise connector initialized for org {self.enterprise_id} "
                f"with {len(self.workspaces)} workspaces"
            )
            return True

        except Exception as e:
            self.logger.error(
                f"Failed to initialize Slack Enterprise connector: {e}",
                exc_info=True
            )
            return False

    async def _load_workspaces(self) -> None:
        """Load all workspaces in the Enterprise Grid."""
        if not self.data_source:
            return

        cursor: Optional[str] = None

        while True:
            # Use admin.teams.list to get all workspaces
            response = await self.data_source.admin_teams_list(
                limit=100,
                cursor=cursor
            )

            if not response.success:
                self.logger.warning(
                    f"Failed to load workspaces: {response.error}. "
                    "Make sure the app has admin.teams:read scope."
                )
                break

            data = response.data or {}
            teams = data.get("teams", [])

            for team in teams:
                workspace = SlackWorkspace(
                    id=team.get("id", ""),
                    name=team.get("name", ""),
                    domain=team.get("domain", ""),
                    is_primary=team.get("is_primary", False),
                    is_verified=team.get("is_verified", False),
                    icon_url=team.get("icon", {}).get("image_original"),
                )

                # Filter if specific workspaces selected
                if (
                    self.sync_all_workspaces
                    or workspace.id in self.selected_workspace_ids
                ):
                    self.workspaces[workspace.id] = workspace

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        self.logger.info(f"Loaded {len(self.workspaces)} workspaces")

    async def run_sync(self) -> None:
        """
        Run full synchronization across all workspaces.

        For Enterprise Grid, we sync:
        1. All users across the org
        2. All workspaces
        3. All channels in each workspace
        4. Messages from accessible channels
        5. Files
        """
        try:
            self.logger.info(
                f"Starting Slack Enterprise sync for org {self.enterprise_id}"
            )

            # Step 1: Sync all org users
            self.logger.info("Step 1: Syncing org-wide users...")
            await self._sync_enterprise_users()

            # Step 2: Sync each workspace
            for workspace_id, workspace in self.workspaces.items():
                self.logger.info(
                    f"Syncing workspace: {workspace.name} ({workspace_id})"
                )
                await self._sync_workspace(workspace)

            self.logger.info("Slack Enterprise sync completed.")

        except Exception as ex:
            self.logger.error(
                f"Error in Slack Enterprise sync: {ex}",
                exc_info=True
            )
            raise

    async def _sync_enterprise_users(self) -> None:
        """Sync all users across the enterprise using admin API."""
        if not self.data_source:
            return

        self.logger.info("Syncing enterprise-wide users...")
        cursor: Optional[str] = None

        while True:
            # Use admin.users.list for org-wide user list
            response = await self.data_source.admin_users_list(
                limit=200,
                cursor=cursor
            )

            if not response.success:
                self.logger.warning(
                    f"Failed to fetch enterprise users: {response.error}. "
                    "Falling back to workspace-level user sync."
                )
                # Fall back to base class user sync
                await self._sync_users()
                return

            data = response.data or {}
            users = data.get("users", [])

            # Process users similar to base class
            for user_data in users:
                user_id = user_data.get("id", "")
                profile = user_data.get("profile", {})
                email = profile.get("email")

                if user_data.get("is_bot") or user_data.get("deleted"):
                    continue

                user = SlackUser(
                    id=user_id,
                    email=email,
                    name=user_data.get("name", ""),
                    real_name=user_data.get("real_name") or profile.get("real_name"),
                    is_bot=user_data.get("is_bot", False),
                    is_deleted=user_data.get("deleted", False),
                )

                self._user_cache[user_id] = user
                if email:
                    self._user_email_map[user_id] = email
                    self._email_user_map[email] = user_id

            response_metadata = data.get("response_metadata", {})
            cursor = response_metadata.get("next_cursor")

            if not cursor:
                break

        self.logger.info(f"Synced {len(self._user_cache)} enterprise users")

    async def _sync_workspace(self, workspace: SlackWorkspace) -> None:
        """
        Sync a single workspace.

        Args:
            workspace: SlackWorkspace to sync
        """
        self.logger.info(f"Syncing workspace: {workspace.name}")

        # Sync channels as groups for this workspace
        await self._sync_channels_as_groups()

        # Auto-join public channels
        await self._auto_join_channels()

        # Sync messages
        await self._sync_channel_messages()

        # Sync DMs if user auth available
        await self._sync_dm_messages_with_user_tokens()

        # Sync files
        await self._sync_files()


def get_enterprise_manifest(
    app_name: str = "Thero Enterprise Connector",
    webhook_url: str = "https://your-domain.com/api/v1/connectors/slack/webhook",
    redirect_url: str = "https://your-domain.com/connectors/oauth/callback/SlackEnterprise",
) -> Dict[str, Any]:
    """
    Generate Slack App manifest for Enterprise Grid deployment.

    Args:
        app_name: Display name for the app
        webhook_url: Webhook endpoint URL
        redirect_url: OAuth redirect URL

    Returns:
        Dict containing the enterprise manifest
    """
    return {
        "display_information": {
            "name": app_name,
            "description": "Enterprise-wide Thero integration for Slack",
            "background_color": "#4A154B",
        },
        "features": {
            "bot_user": {
                "display_name": app_name,
                "always_online": True,
            },
        },
        "oauth_config": {
            "redirect_urls": [redirect_url],
            "scopes": {
                "bot": SLACK_ENTERPRISE_SCOPES,
                "user": SLACK_USER_SCOPES,
            },
        },
        "settings": {
            "event_subscriptions": {
                "request_url": webhook_url,
                "bot_events": [
                    "message.channels",
                    "message.groups",
                    "channel_created",
                    "channel_deleted",
                    "channel_archive",
                    "channel_unarchive",
                    "member_joined_channel",
                    "member_left_channel",
                    "user_change",
                    "team_join",
                    "file_shared",
                    "file_deleted",
                ],
                "user_events": [
                    "message.im",
                    "message.mpim",
                ],
            },
            "interactivity": {
                "is_enabled": False,
            },
            "org_deploy_enabled": True,  # Enable org-wide deployment
            "socket_mode_enabled": False,
            "token_rotation_enabled": True,
        },
    }




