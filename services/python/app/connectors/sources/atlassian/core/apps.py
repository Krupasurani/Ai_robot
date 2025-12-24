from app.connectors.core.interfaces.connector.apps import App
from libs.core.constants import AppGroups, Connectors


class ConfluenceApp(App):
    def __init__(self) -> None:
        super().__init__(Connectors.CONFLUENCE, AppGroups.ATLASSIAN)

class JiraApp(App):
    def __init__(self) -> None:
        super().__init__(Connectors.JIRA, AppGroups.ATLASSIAN)
