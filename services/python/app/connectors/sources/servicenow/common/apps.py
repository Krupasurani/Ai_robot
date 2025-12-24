from app.connectors.core.interfaces.connector.apps import App, AppGroup
from libs.core.constants import AppGroups, Connectors


class ServicenowApp(App):
    """ServiceNow Knowledge Base App definition"""

    def __init__(self) -> None:
        super().__init__(Connectors.SERVICENOW, AppGroups.SERVICENOW)


class ServiceNowAppGroup(AppGroup):
    """ServiceNow App Group containing all ServiceNow connectors"""

    def __init__(self) -> None:
        super().__init__(AppGroups.SERVICENOW, [ServicenowApp()])
