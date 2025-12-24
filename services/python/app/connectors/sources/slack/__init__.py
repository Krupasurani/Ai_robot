"""Slack connector module for syncing messages, channels, and files from Slack."""

from app.connectors.sources.slack.connector import SlackConnector
from app.connectors.sources.slack.enterprise import (
    SLACK_ENTERPRISE_OAUTH_SCOPES,
    SLACK_ENTERPRISE_SCOPES,
    SlackEnterpriseConnector,
    SlackWorkspace,
    get_enterprise_manifest,
)
from app.connectors.sources.slack.manifest import (
    SLACK_SCOPES_DOCUMENTATION,
    get_slack_app_manifest,
    get_slack_app_manifest_yaml,
    get_slack_enterprise_manifest,
)
from app.connectors.sources.slack.oauth_handler import (
    SlackOAuthProvider,
    SlackOAuthToken,
    handle_slack_oauth_callback,
)
from app.connectors.sources.slack.user_auth_service import (
    SLACK_USER_DM_SCOPES,
    SlackUserAuthService,
    SlackUserToken,
)
from app.connectors.sources.slack.webhook_handler import (
    SlackEvent,
    SlackEventType,
    SlackWebhookHandler,
    create_slack_webhook_endpoint,
)

__all__ = [
    # Standard Connector
    "SlackConnector",
    # Enterprise Connector
    "SlackEnterpriseConnector",
    "SlackWorkspace",
    "SLACK_ENTERPRISE_SCOPES",
    "SLACK_ENTERPRISE_OAUTH_SCOPES",
    "get_enterprise_manifest",
    # Manifest
    "get_slack_app_manifest",
    "get_slack_app_manifest_yaml",
    "get_slack_enterprise_manifest",
    "SLACK_SCOPES_DOCUMENTATION",
    # OAuth
    "SlackOAuthProvider",
    "SlackOAuthToken",
    "handle_slack_oauth_callback",
    # User Auth
    "SlackUserAuthService",
    "SlackUserToken",
    "SLACK_USER_DM_SCOPES",
    # Webhooks
    "SlackWebhookHandler",
    "SlackEvent",
    "SlackEventType",
    "create_slack_webhook_endpoint",
]
