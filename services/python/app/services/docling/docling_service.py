import asyncio
import base64
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.models.blocks import BlocksContainer
from app.modules.parsers.pdf.processor import PDFProcessor
from libs.core.constants import HttpStatusCode
from libs.core.logging import create_logger

# ConfigService will be injected via dependency injection
PDF_PROCESSING_TIMEOUT_SECONDS = 40 * 60
MAX_PDF_BYTES = 100 * 1024 * 1024

class ProcessRequest(BaseModel):
    record_name: str
    pdf_binary: str  # base64 encoded PDF binary data
    org_id: Optional[str] = None
    record_id: Optional[str] = None


class ProcessResponse(BaseModel):
    success: bool
    block_containers: Optional[dict] = None
    error: Optional[str] = None


class DoclingService:
    """
    PDF Processing Service using Digital-First approach.

    This service uses:
    1. PDFProcessor with PyMuPDF for digital PDFs (instant text extraction)
    2. OCRmyPDF for scanned PDFs (via OCRHandler)
    3. Local Docling for structure extraction

    Result: Sub-second processing for digital PDFs, high quality for scans.
    """

    def __init__(self, config_service=None, logger=None) -> None:
        self.logger = logger or create_logger(__name__)
        self.config_service = config_service
        self.processor = None

    async def initialize(self) -> None:
        """Initialize the service with configuration"""
        try:
            # Allow external wiring to provide config_service. If not provided,
            # skip initialization and let the caller wire it later.
            if not self.config_service:
                raise ValueError("Config service not provided")

            # Initialize PDFProcessor (Digital-First approach for digital PDFs)
            self.processor = PDFProcessor(
                logger=self.logger,
                config=self.config_service
            )

            self.logger.info("✅ Docling service initialized (local processing)")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Docling service: {str(e)}")
            raise

    async def process_pdf(self, record_name: str, pdf_binary: bytes, record_id: Optional[str] = None) -> BlocksContainer:
        """
        Process PDF using Digital-First approach.

        Digital PDFs: PyMuPDF text extraction (fast, accurate)
        Scanned PDFs: OCRmyPDF for OCR, then local Docling for structure
        """
        try:
            self.logger.info(f"🚀 Processing PDF: {record_name}")
            if self.processor is None:
                raise RuntimeError("DoclingService not initialized: processor is None")

            # Use PDFProcessor's process_pdf_to_blocks method
            result = await self.processor.process_pdf_to_blocks(
                pdf_content=pdf_binary,
                doc_name=record_name,
                record_id=record_id,
            )

            if result is None:
                raise ValueError("PDFProcessor returned None - processing failed")

            self.logger.info(f"✅ Successfully processed PDF: {record_name}")
            return result

        except Exception as e:
            self.logger.error(f"❌ Error processing PDF {record_name}: {str(e)}")
            raise

    async def health_check(self) -> bool:
        """Check if the Docling service is healthy"""
        try:
            # Check if service is properly initialized
            if self.processor is None:
                self.logger.warning("⚠️ DoclingService not initialized: processor is None")
                return False

            # Additional health checks can be added here
            # For now, just check if the processor exists
            return True
        except Exception as e:
            self.logger.error(f"❌ Health check failed: {str(e)}")
            return False


# Global service instance (to be set by the application wiring)
docling_service: Optional[DoclingService] = None

def set_docling_service(service: DoclingService) -> None:
    """Wire an initialized DoclingService instance for the route handlers to use."""
    # Avoid using `global` assignment elsewhere; this function is the single writer
    globals()["docling_service"] = service

# FastAPI app
app = FastAPI(
    title="Docling Processing Service",
    description="Microservice for PDF processing using Docling",
    version="1.0.0"
)


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize the service on startup when running this module standalone.
    When mounted by an external app (e.g., app.docling_main), the external app
    should wire and initialize the service via set_docling_service().
    """
    if docling_service is None:
        # If not wired by external app yet, skip initialization quietly
        return
    if getattr(docling_service, "processor", None) is None:
        await docling_service.initialize()


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint"""
    svc = globals().get("docling_service")
    if svc is None:
        return {"status": "unhealthy", "service": "docling", "error": "service not wired"}

    try:
        is_healthy = await svc.health_check()
    except Exception as e:
        return {"status": "unhealthy", "service": "docling", "error": str(e)}

    if not is_healthy:
        return {"status": "unhealthy", "service": "docling", "error": "processor not initialized"}

    return {"status": "healthy", "service": "docling"}




@app.post("/process-pdf-file", response_model=ProcessResponse)
async def process_pdf_file_endpoint(
    file: UploadFile = File(...),
    record_name: str = Form(...),
    record_id: Optional[str] = Form(None)
) -> ProcessResponse:
    """Process PDF document from file upload"""
    try:
        # Read file content
        pdf_binary = await file.read()

        if len(pdf_binary) == 0:
            raise HTTPException(
                status_code=HttpStatusCode.BAD_REQUEST.value,
                detail="PDF file is empty"
            )

        if len(pdf_binary) > MAX_PDF_BYTES:
            raise HTTPException(
                status_code=HttpStatusCode.BAD_REQUEST.value,
                detail=f"PDF too large ({len(pdf_binary)} bytes), max {MAX_PDF_BYTES}"
            )

        # Ensure service is wired
        if docling_service is None:
            raise HTTPException(status_code=500, detail="Docling service not available")

        # Process the PDF with 40 minute timeout
        block_containers = await asyncio.wait_for(
            docling_service.process_pdf(
                record_name,
                pdf_binary,
                record_id
            ),
            timeout=PDF_PROCESSING_TIMEOUT_SECONDS
        )

        # Convert BlocksContainer to dict for JSON serialization
        block_containers_dict = serialize_blocks_container(block_containers)

        return ProcessResponse(
            success=True,
            block_containers=block_containers_dict
        )

    except asyncio.TimeoutError:
        return ProcessResponse(
            success=False,
            error=f"Processing timed out after {PDF_PROCESSING_TIMEOUT_SECONDS} seconds"
        )
    except HTTPException:
        raise
    except Exception as e:
        return ProcessResponse(
            success=False,
            error=f"Processing failed: {str(e)}"
        )


@app.post("/process-pdf", response_model=ProcessResponse)
async def process_pdf_endpoint(request: ProcessRequest) -> ProcessResponse:
    """Process PDF document using Docling"""
    try:
        # Decode base64 PDF binary data
        try:
            pdf_binary = base64.b64decode(request.pdf_binary, validate=True)
        except Exception as e:
            raise HTTPException(
                status_code=HttpStatusCode.BAD_REQUEST.value,
                detail=f"Invalid base64 PDF data: {str(e)}"
            )

        if len(pdf_binary) == 0:
            raise HTTPException(
                status_code=HttpStatusCode.BAD_REQUEST.value,
                detail="PDF payload is empty"
            )

        if len(pdf_binary) > MAX_PDF_BYTES:
            raise HTTPException(
                status_code=HttpStatusCode.BAD_REQUEST.value,
                detail=f"PDF too large ({len(pdf_binary)} bytes), max {MAX_PDF_BYTES}"
            )

        # Ensure service is wired
        if docling_service is None:
            raise HTTPException(status_code=500, detail="Docling service not available")

        # Process the PDF with 40 minute timeout
        block_containers = await asyncio.wait_for(docling_service.process_pdf(
                request.record_name,
                pdf_binary,
                request.record_id
            ),
            timeout=PDF_PROCESSING_TIMEOUT_SECONDS  # 40 minutes in seconds
        )

        # Convert BlocksContainer to dict for JSON serialization
        # We'll need to implement a proper serialization method
        block_containers_dict = serialize_blocks_container(block_containers)


        return ProcessResponse(
            success=True,
            block_containers=block_containers_dict
        )

    except asyncio.TimeoutError:
        return ProcessResponse(
            success=False,
            error=f"Processing timed out after {PDF_PROCESSING_TIMEOUT_SECONDS} seconds"
        )
    except HTTPException:
        raise
    except Exception as e:
        return ProcessResponse(
            success=False,
            error=f"Processing failed: {str(e)}"
        )

def serialize_blocks_container(blocks_container: BlocksContainer) -> dict:
    """Serialize BlocksContainer to dictionary for JSON response"""
    try:
        # Convert to dict using the model's dict method.
        # If this fails, it indicates an issue with the Pydantic model definitions that should be fixed.
        return blocks_container.dict()
    except Exception as e:
        # Re-raise the exception to make the serialization issue visible and easier to debug.
        # A logger should be used here to capture the error details.
        raise TypeError(f"Failed to serialize BlocksContainer: {e}") from e


def run(host: str = "0.0.0.0", port: int = 8081, reload: bool = False) -> None:
    """Run the Docling service"""
    uvicorn.run(
        "app.services.docling.docling_service:app",
        host=host,
        port=port,
        log_level="info",
        reload=reload
    )


if __name__ == "__main__":
    run(reload=False)
