from app.connectors.core.interfaces.connector.apps import App
from libs.core.constants import AppGroups, Connectors


class BookStackApp(App):
    def __init__(self) -> None:
        super().__init__(Connectors.BOOKSTACK.value, AppGroups.BOOKSTACK.value)
