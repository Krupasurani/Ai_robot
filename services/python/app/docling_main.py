"""
Docling Processing Service.

This service handles document processing using local Docling and OCRmyPDF.

For digital PDFs, PyMuPDF extracts text directly (fast, accurate).
For scanned PDFs, OCRmyPDF handles OCR, then Docling extracts structure.

Performance Environment Variables:
    DOCLING_WORKERS: Number of uvicorn workers (default: 1)
    DOCLING_MAX_WORKERS: Max parallel threads for page processing (default: CPU cores, max 8)
"""

import asyncio
import os
import signal
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse


def _log_startup_info():
    """Log startup configuration information."""
    import logging
    _log = logging.getLogger(__name__)

    cpu_count = os.cpu_count() or 4

    _log.info(
        f"⚙️ Docling Service Configuration:\n"
        f"   CPU cores available: {cpu_count}"
    )


# Log startup info
_log_startup_info()

from app.containers.docling import DoclingAppContainer, initialize_container
from app.services.docling.docling_service import (
    DoclingService,
    set_docling_service,
)
from app.services.docling.docling_service import (
    app as docling_app,
)
from libs.core.constants import HttpStatusCode
from libs.core.utils import get_epoch_timestamp_in_ms


def handle_sigterm(signum, frame) -> None:
    """Handle shutdown signals gracefully."""
    print(f"Received signal {signum}, {frame} shutting down gracefully")
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)


# Initialize container
container = DoclingAppContainer.init("docling_service")
container_lock = asyncio.Lock()


async def get_initialized_container() -> DoclingAppContainer:
    """Dependency provider for initialized container."""
    if not hasattr(get_initialized_container, "initialized"):
        async with container_lock:
            if not hasattr(get_initialized_container, "initialized"):
                await initialize_container(container)
                container.wire(modules=["app.services.docling.docling_service"])
                get_initialized_container.initialized = True
    return container


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for FastAPI."""
    app_container = await get_initialized_container()
    app.container = app_container

    config_service = app_container.config_service()
    logger = app_container.logger()

    # Initialize Docling service
    app.state.docling_service = DoclingService(
        config_service=config_service, logger=logger
    )
    await app.state.docling_service.initialize()
    set_docling_service(app.state.docling_service)

    logger.info("✅ Docling service initialized (local processing)")

    yield

    logger.info("🔄 Shutting down Docling service")


app = FastAPI(
    lifespan=lifespan,
    title="Docling Processing Service",
    description="Document processing with local Docling and OCRmyPDF",
    version="2.0.0",
)

app.mount("/", docling_app)


@app.get("/health")
async def health_check() -> JSONResponse:
    """Health check endpoint."""
    try:
        svc = getattr(app.state, "docling_service", None)
        if not svc:
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "service": "docling",
                    "error": "DoclingService not initialized",
                    "timestamp": get_epoch_timestamp_in_ms(),
                },
            )

        if not hasattr(svc, "health_check"):
            return JSONResponse(
                status_code=503,
                content={
                    "status": "unhealthy",
                    "service": "docling",
                    "error": "DoclingService missing health_check",
                    "timestamp": get_epoch_timestamp_in_ms(),
                },
            )

        is_healthy = await svc.health_check()

        if is_healthy:
            return JSONResponse(
                status_code=HttpStatusCode.SUCCESS.value,
                content={
                    "status": "healthy",
                    "service": "docling",
                    "timestamp": get_epoch_timestamp_in_ms(),
                },
            )
        else:
            return JSONResponse(
                status_code=HttpStatusCode.UNHEALTHY.value,
                content={
                    "status": "unhealthy",
                    "service": "docling",
                    "timestamp": get_epoch_timestamp_in_ms(),
                },
            )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status": "fail",
                "error": str(e),
                "timestamp": get_epoch_timestamp_in_ms(),
            },
        )


def run(host: str = "0.0.0.0", port: int = 8081, reload: bool = False) -> None:
    """
    Run the Docling service.

    Digital PDFs: Processed locally via PyMuPDF (fast)
    Scanned PDFs: OCRmyPDF for OCR, then Docling for structure
    """
    import logging
    _log = logging.getLogger(__name__)

    # Workers configuration
    workers = int(os.getenv("DOCLING_WORKERS", "1"))

    # Log startup config
    _log.info(f"🚀 Starting Docling service on {host}:{port}")
    _log.info(f"👷 Workers: {workers}")
    _log.info(f"🔄 Reload: {reload}")

    uvicorn.run(
        "app.docling_main:app",
        host=host,
        port=port,
        log_level="info",
        reload=reload,
        workers=workers if not reload else 1,
    )


if __name__ == "__main__":
    run(reload=False)
