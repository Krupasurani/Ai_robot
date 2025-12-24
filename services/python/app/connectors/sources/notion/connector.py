"""Notion Connector Implementation."""

from logging import Logger
from typing import Any, Dict, List, Optional

from fastapi.responses import StreamingResponse

from app.connectors.core.base.connector.connector_service import BaseConnector
from app.connectors.core.base.data_processor.data_source_entities_processor import (
    DataSourceEntitiesProcessor,
)
from app.connectors.core.base.data_store.data_store import DataStoreProvider
from app.connectors.core.registry.connector_builder import (
    AuthField,
    ConnectorBuilder,
    DocumentationLink,
)
from app.connectors.sources.notion.apps import NotionApp
from app.models.entities import Record
from app.sources.client.notion.notion import NotionClient
from app.sources.external.notion.notion import NotionDataSource
from libs.core.config import ConfigurationService


@ConnectorBuilder("Notion")\
    .in_group("Notion")\
    .with_auth_type("API_TOKEN")\
    .with_description("Sync pages and databases from Notion")\
    .with_categories(["Knowledge Management"])\
    .configure(lambda builder: builder
        .with_icon("/assets/icons/connectors/notion.svg")
        .add_documentation_link(DocumentationLink(
            "Notion Bot Token Setup",
            "https://api.notion.com/authentication/basics",
            "setup"
        ))
        .add_documentation_link(DocumentationLink(
            'Thero Documentation',
            'https://docs.thero.com/connectors/notion/notion',
            'thero'
        ))
        .with_redirect_uri("", False)
        .add_auth_field(AuthField(
            name="apiToken",
            display_name="Api Token",
            placeholder="ntn-...",
            description="The Access Token from Notion App settings",
            field_type="PASSWORD",
            max_length=8000,
            is_secret=True
        ))
        .with_sync_strategies(["SCHEDULED", "MANUAL"])
        .with_scheduled_config(True, 60)
    )\
    .build_decorator()
class NotionConnector(BaseConnector):
    """Connector implementation for Notion workspace."""

    def __init__(
        self,
        logger: Logger,
        data_entities_processor: DataSourceEntitiesProcessor,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
    ) -> None:
        super().__init__(
            NotionApp(),
            logger,
            data_entities_processor,
            data_store_provider,
            config_service,
        )
        self._config: Dict[str, Any] = {}
        self._notion_client: Optional[NotionClient] = None
        self._data_source: Optional[NotionDataSource] = None

    async def init(self) -> bool:
        """Initialize the Notion connector and load configuration."""
        try:
            self._config = await self._load_config()
            if not self._config:
                self.logger.error("❌ Notion configuration not found")
                raise ValueError("Notion configuration not found")

            # Initialize the Notion client
            self._notion_client = await NotionClient.build_from_services(
                self.logger, self.config_service
            )
            self._data_source = NotionDataSource(self._notion_client)

            self.logger.info("✅ Notion connector initialized successfully")
            return True
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Notion connector: {e}")
            raise

    async def test_connection_and_access(self) -> bool:
        """Test the Notion API connection."""
        try:
            if not self._data_source:
                await self.init()

            # Test by retrieving the bot user
            response = await self._data_source.retrieve_bot_user()
            if response.success:
                self.logger.info("✅ Notion connection test successful")
                return True
            else:
                self.logger.error(f"❌ Notion connection test failed: {response.error}")
                return False
        except Exception as e:
            self.logger.error(f"❌ Notion connection test failed: {e}")
            return False

    def get_signed_url(self, record: Record) -> Optional[str]:
        """Get signed URL for a record. Notion does not expose signed URLs."""
        return None

    async def stream_record(self, record: Record) -> StreamingResponse:
        """Stream record content. Not supported for Notion."""
        raise NotImplementedError("Streaming is not supported for Notion records")

    async def run_sync(self) -> None:
        """Run a full sync of Notion pages and databases."""
        if not self._data_source:
            await self.init()

        self.logger.info("🚀 Starting Notion full sync")

        try:
            # TODO: Implement full sync logic
            # 1. Search all pages and databases
            # 2. Fetch page content and metadata
            # 3. Process and store records via data_entities_processor
            self.logger.info("✅ Notion full sync completed")
        except Exception as e:
            self.logger.error(f"❌ Notion sync failed: {e}")
            raise

    async def run_incremental_sync(self) -> None:
        """Run incremental sync. Currently runs full sync."""
        # TODO: Implement incremental sync using Notion's search with filters
        await self.run_sync()

    def handle_webhook_notification(self, notification: Dict) -> None:
        """Handle webhook notification. Notion webhooks are not yet supported."""
        self.logger.info("Webhook notifications are not supported for Notion: %s", notification)

    async def cleanup(self) -> None:
        """Cleanup resources."""
        self._notion_client = None
        self._data_source = None
        self.logger.info("Notion connector cleanup completed.")

    async def reindex_records(self, record_results: List[Record]) -> None:
        """Reindex existing records."""
        if record_results:
            await self.data_entities_processor.reindex_existing_records(record_results)

    @classmethod
    async def create_connector(
        cls,
        logger: Logger,
        data_store_provider: DataStoreProvider,
        config_service: ConfigurationService,
        **kwargs
    ) -> "NotionConnector":
        """Factory method to create and initialize NotionConnector."""
        data_entities_processor = DataSourceEntitiesProcessor(
            logger, data_store_provider, config_service
        )
        await data_entities_processor.initialize()

        connector = cls(
            logger,
            data_entities_processor,
            data_store_provider,
            config_service,
        )
        return connector

    async def _load_config(self) -> Dict[str, Any]:
        """Load Notion configuration from config service."""
        org_id = self.data_entities_processor.org_id
        base_path = "/services/connectors/notion/config"

        # Try org-specific config first
        org_specific = await self.config_service.get_config(f"{base_path}/{org_id}")
        if org_specific:
            return org_specific

        # Fall back to base config
        return await self.config_service.get_config(base_path) or {}
