"""Celery tasks for the Samba connector."""

import asyncio
from datetime import datetime

from celery import shared_task
from dependency_injector import providers

from app.connectors.core.base.data_store.arango_data_store import ArangoDataStore
from app.connectors.sources.samba.connector import SambaConnector
from app.containers.connector import ConnectorAppContainer, initialize_container

_container = ConnectorAppContainer.init("samba_sync_service")
_container_ready = False

async def _ensure_container() -> None:
    global _container_ready
    if not _container_ready:
        await initialize_container(_container)
        _container_ready = True

async def _get_or_create_connector() -> SambaConnector:
    await _ensure_container()
    logger = _container.logger()
    try:
        connector: SambaConnector = _container.samba_connector()  # type: ignore[assignment]
        if connector:
            return connector
    except Exception:
        connector = None  # type: ignore[assignment]

    config_service = _container.config_service()
    arango_service = await _container.arango_service()
    data_store_provider = ArangoDataStore(logger, arango_service)

    connector = await SambaConnector.create_connector(
        logger,
        data_store_provider,
        config_service,
    )
    _container.samba_connector.override(providers.Object(connector))
    return connector

async def _run_samba_sync() -> None:
    connector = await _get_or_create_connector()
    await connector.run_sync()

@shared_task(
    name="app.connectors.sources.samba.sync_tasks.schedule_samba_sync",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
)
def schedule_samba_sync() -> None:
    """Entry point for the periodic Samba sync task."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_run_samba_sync())
    finally:
        loop.close()

    logger = _container.logger()
    logger.info("✅ Samba sync executed at %s", datetime.utcnow().isoformat())
