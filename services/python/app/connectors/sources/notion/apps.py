from app.connectors.core.interfaces.connector.apps import App
from libs.core.constants import AppGroups, Connectors


class NotionApp(App):
    """Application metadata for the Notion connector."""

    def __init__(self) -> None:
        super().__init__(Connectors.NOTION, AppGroups.NOTION)
