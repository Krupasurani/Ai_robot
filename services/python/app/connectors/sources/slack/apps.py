"""Slack App definition for the connector framework."""

from app.connectors.core.interfaces.connector.apps import App
from libs.core.constants import AppGroups, Connectors


class SlackApp(App):
    """Slack application configuration for the connector."""

    def __init__(self) -> None:
        super().__init__(Connectors.SLACK.value, AppGroups.SLACK.value)
