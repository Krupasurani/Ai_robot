from dependency_injector import containers, providers  # type: ignore
from dotenv import load_dotenv  # type: ignore

from app.containers.container import BaseAppContainer
from app.containers.utils.utils import ContainerUtils
from app.health.health import Health

# New libs imports
from libs.core import create_logger
from libs.core.config import ConfigurationService

# App imports (still needed for app-specific modules)
from libs.core.config.providers.etcd import Etcd3EncryptedKeyValueStore
from libs.data.vector import VECTOR_DB_COLLECTION_NAME

load_dotenv(override=True)


class IndexingAppContainer(BaseAppContainer):
    """Dependency injection container for the indexing application."""

    # Override logger with service-specific name
    logger = providers.Singleton(create_logger, "indexing_service")
    container_utils = ContainerUtils()
    # Override config_service to use the service-specific logger
    key_value_store = providers.Singleton(Etcd3EncryptedKeyValueStore, logger=logger)
    config_service = providers.Singleton(ConfigurationService, logger=logger, key_value_store=key_value_store)

    # Override arango_client and redis_client to use the service-specific config_service
    arango_client = providers.Resource(
        BaseAppContainer._create_arango_client, config_service=config_service
    )
    redis_client = providers.Resource(
        BaseAppContainer._create_redis_client, config_service=config_service
    )
    kafka_service = providers.Singleton(lambda: None)  # Not used in indexing service
    arango_service = providers.Resource(
        container_utils.create_arango_service,
        logger=logger,
        arango_client=arango_client,
        config_service=config_service,
        kafka_service=kafka_service,
    )
    vector_db_service = providers.Resource(
        container_utils.get_vector_db_service,
        config_service=config_service,
    )
    indexing_pipeline = providers.Resource(
        container_utils.create_indexing_pipeline,
        logger=logger,
        config_service=config_service,
        arango_service=arango_service,
        vector_db_service=vector_db_service,
    )

    document_extractor = providers.Resource(
        container_utils.create_document_extractor,
        logger=logger,
        arango_service=arango_service,
        config_service=config_service,
    )

    blob_storage = providers.Resource(
        container_utils.create_blob_storage,
        logger=logger,
        config_service=config_service,
        arango_service=arango_service,
    )

    arango = providers.Resource(
        container_utils.create_arango,
        arango_service=arango_service,
        logger=logger,
    )

    vector_store = providers.Resource(
        container_utils.create_vector_store,
        logger=logger,
        arango_service=arango_service,
        config_service=config_service,
        vector_db_service=vector_db_service,
        collection_name=VECTOR_DB_COLLECTION_NAME,
    )

    sink_orchestrator = providers.Resource(
        container_utils.create_sink_orchestrator,
        logger=logger,
        arango=arango,
        blob_storage=blob_storage,
        vector_store=vector_store,
        arango_service=arango_service,
    )

    # Parsers
    parsers = providers.Resource(container_utils.create_parsers, logger=logger)
    domain_extractor = providers.Resource(container_utils.create_domain_extractor, logger=logger, arango_service=arango_service, config_service=config_service)
    # Processor - depends on domain_extractor, indexing_pipeline, and arango_service
    processor = providers.Resource(
        container_utils.create_processor,
        logger=logger,
        config_service=config_service,
        indexing_pipeline=indexing_pipeline,
        arango_service=arango_service,
        parsers=parsers,
        document_extractor=document_extractor,
        sink_orchestrator=sink_orchestrator,
        domain_extractor=domain_extractor,
    )

    event_processor = providers.Resource(
        container_utils.create_event_processor,
        logger=logger,
        processor=processor,
        arango_service=arango_service,
    )

    redis_scheduler = providers.Resource(
        container_utils.create_redis_scheduler,
        logger=logger,
        config_service=config_service,
    )

    # Indexing-specific wiring configuration
    wiring_config = containers.WiringConfiguration(
        modules=[
            "app.indexing_main",
            "app.modules.extraction.domain_extraction",
        ]
    )

async def initialize_container(container: IndexingAppContainer) -> bool:
    """Initialize container resources"""
    logger = container.logger()
    logger.info("🚀 Initializing application resources")

    try:
        # Bootstrap AI_MODELS configuration from environment to etcd
        logger.info("Bootstrapping AI_MODELS configuration")
        config_service = container.config_service()
        await config_service.ensure_ai_models_config_seeded()
        logger.info("✅ AI_MODELS configuration bootstrap complete")

        # Ensure connector service is healthy before starting indexing service
        logger.info("Checking Connector service health before startup")
        await Health.health_check_connector_service(container)

        # Ensure ArangoDB service is initialized (connection is handled in the resource factory)
        logger.info("Ensuring ArangoDB service is initialized")
        arango_service = await container.arango_service()
        if not arango_service:
            raise Exception("Failed to initialize ArangoDB service")

        logger.info("✅ ArangoDB service initialized")

        await Health.system_health_check(container)
        return True

    except Exception as e:
        logger.error(f"❌ Failed to initialize resources: {str(e)}")
        raise
