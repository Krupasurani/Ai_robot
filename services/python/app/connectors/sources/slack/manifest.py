"""
Slack App Manifest Template for Thero Connector.

This module provides the Slack App manifest that admins can use to create
and configure their Slack App for the Thero connector integration.

Usage:
1. Copy the manifest from get_slack_app_manifest()
2. Go to https://api.slack.com/apps
3. Click "Create New App" -> "From an app manifest"
4. Paste the manifest and customize the redirect URL
"""

from typing import Any, Dict


def get_slack_app_manifest(
    app_name: str = "Thero Connector",
    webhook_url: str = "https://your-domain.com/api/v1/connectors/slack/webhook",
    redirect_url: str = "https://your-domain.com/connectors/oauth/callback/Slack",
) -> Dict[str, Any]:
    """
    Generate a Slack App manifest for the Thero connector.

    Args:
        app_name: The display name for the Slack app
        webhook_url: The URL for Slack event subscriptions
        redirect_url: The OAuth redirect URL

    Returns:
        Dict containing the complete Slack App manifest
    """
    return {
        "display_information": {
            "name": app_name,
            "description": "Connect your Slack workspace to Thero for intelligent search and knowledge discovery",
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
                "bot": [
                    # Channel access
                    "channels:read",
                    "channels:history",
                    "channels:join",
                    # Private channel access
                    "groups:read",
                    "groups:history",
                    # User info (required for RBAC)
                    "users:read",
                    "users:read.email",
                    # File access
                    "files:read",
                    # Workspace info
                    "team:read",
                ],
                "user": [
                    # DM access (requires individual user authorization)
                    "im:read",
                    "im:history",
                    # Multi-person DM access
                    "mpim:read",
                    "mpim:history",
                ],
            },
        },
        "settings": {
            "event_subscriptions": {
                "request_url": webhook_url,
                "bot_events": [
                    # Message events for real-time sync
                    "message.channels",
                    "message.groups",
                    # Channel events
                    "channel_created",
                    "channel_deleted",
                    "channel_archive",
                    "channel_unarchive",
                    "channel_rename",
                    # Member events
                    "member_joined_channel",
                    "member_left_channel",
                    # User events
                    "user_change",
                    "team_join",
                    # File events
                    "file_shared",
                    "file_deleted",
                ],
                "user_events": [
                    # DM events (for users who have authorized)
                    "message.im",
                    "message.mpim",
                ],
            },
            "interactivity": {
                "is_enabled": False,
            },
            "org_deploy_enabled": False,
            "socket_mode_enabled": False,
            "token_rotation_enabled": True,
        },
    }


def get_slack_app_manifest_yaml(
    app_name: str = "Thero Connector",
    webhook_url: str = "https://your-domain.com/api/v1/connectors/slack/webhook",
    redirect_url: str = "https://your-domain.com/connectors/oauth/callback/Slack",
) -> str:
    """
    Generate a Slack App manifest in YAML format for easy copying.

    Args:
        app_name: The display name for the Slack app
        webhook_url: The URL for Slack event subscriptions
        redirect_url: The OAuth redirect URL

    Returns:
        String containing the YAML manifest
    """
    return f"""display_information:
  name: {app_name}
  description: Connect your Slack workspace to Thero for intelligent search and knowledge discovery
  background_color: "#4A154B"

features:
  bot_user:
    display_name: {app_name}
    always_online: true

oauth_config:
  redirect_urls:
    - {redirect_url}
  scopes:
    bot:
      # Channel access
      - channels:read
      - channels:history
      - channels:join
      # Private channel access
      - groups:read
      - groups:history
      # User info (required for RBAC)
      - users:read
      - users:read.email
      # File access
      - files:read
      # Workspace info
      - team:read
    user:
      # DM access (requires individual user authorization)
      - im:read
      - im:history
      # Multi-person DM access
      - mpim:read
      - mpim:history

settings:
  event_subscriptions:
    request_url: {webhook_url}
    bot_events:
      # Message events for real-time sync
      - message.channels
      - message.groups
      # Channel events
      - channel_created
      - channel_deleted
      - channel_archive
      - channel_unarchive
      - channel_rename
      # Member events
      - member_joined_channel
      - member_left_channel
      # User events
      - user_change
      - team_join
      # File events
      - file_shared
      - file_deleted
    user_events:
      # DM events (for users who have authorized)
      - message.im
      - message.mpim
  interactivity:
    is_enabled: false
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: true
"""


# Enterprise Grid manifest with admin scopes
def get_slack_enterprise_manifest(
    app_name: str = "Thero Enterprise Connector",
    webhook_url: str = "https://your-domain.com/api/v1/connectors/slack/webhook",
    redirect_url: str = "https://your-domain.com/connectors/oauth/callback/Slack",
) -> Dict[str, Any]:
    """
    Generate a Slack App manifest for Enterprise Grid deployment.

    This manifest includes additional admin scopes for org-wide access.

    Args:
        app_name: The display name for the Slack app
        webhook_url: The URL for Slack event subscriptions
        redirect_url: The OAuth redirect URL

    Returns:
        Dict containing the complete Slack Enterprise App manifest
    """
    manifest = get_slack_app_manifest(app_name, webhook_url, redirect_url)

    # Add enterprise-specific scopes
    manifest["oauth_config"]["scopes"]["bot"].extend([
        "admin.teams:read",      # List all workspaces in the org
        "admin.users:read",      # List all users across workspaces
        "admin.conversations:read",  # Read all conversations
    ])

    # Enable org deployment
    manifest["settings"]["org_deploy_enabled"] = True

    return manifest


# Scopes documentation for the UI
SLACK_SCOPES_DOCUMENTATION = """
## Required Slack App Scopes

### Bot Token Scopes (Workspace Access)
These scopes are granted when an admin installs the app:

| Scope | Description |
|-------|-------------|
| `channels:read` | View public channels in the workspace |
| `channels:history` | Read messages in public channels |
| `channels:join` | Join public channels automatically |
| `groups:read` | View private channels the bot is in |
| `groups:history` | Read messages in private channels |
| `users:read` | View user profiles |
| `users:read.email` | View user email addresses (required for RBAC) |
| `files:read` | View files shared in channels |
| `team:read` | View workspace information |

### User Token Scopes (DM Access)
These scopes require individual user authorization:

| Scope | Description |
|-------|-------------|
| `im:read` | View direct messages |
| `im:history` | Read direct message history |
| `mpim:read` | View group direct messages |
| `mpim:history` | Read group direct message history |

### Enterprise Grid Scopes (Optional)
Additional scopes for org-wide deployment:

| Scope | Description |
|-------|-------------|
| `admin.teams:read` | List all workspaces in the organization |
| `admin.users:read` | List all users across workspaces |
| `admin.conversations:read` | Read conversations org-wide |
"""




