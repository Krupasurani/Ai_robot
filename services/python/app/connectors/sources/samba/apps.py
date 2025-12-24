from app.connectors.core.interfaces.connector.apps import App
from libs.core.constants import AppGroups, Connectors


class SambaApp(App):
    """Application metadata for the Samba connector."""

    def __init__(self) -> None:
        super().__init__(Connectors.SAMBA, AppGroups.FILE_SERVERS)
