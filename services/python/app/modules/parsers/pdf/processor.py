"""
PDF Processor that combines OCR and Docling processing.

This module provides PDFProcessor class that:
1. Uses OCRHandler to add text layer to scanned PDFs (if needed)
2. Uses DoclingProcessor to extract structure and create BlocksContainer
"""

from typing import Optional

from app.models.blocks import BlocksContainer
from app.modules.parsers.pdf.docling import DoclingProcessor
from app.modules.parsers.pdf.ocr_handler import OCRHandler
from libs.core.constants import OCRProvider


class PDFProcessor:
    """
    PDF Processor using Digital-First approach with OCR and Docling.

    This processor combines:
    1. OCRHandler for OCR processing (adds text layer to scanned PDFs)
    2. DoclingProcessor for structure extraction (headings, tables, paragraphs)

    Result: High-quality processing for both digital and scanned PDFs.
    """

    def __init__(self, logger, config) -> None:
        """
        Initialize PDFProcessor.

        Args:
            logger: Logger instance
            config: Config service instance
        """
        self.logger = logger
        self.config = config

    async def process_pdf_to_blocks(
        self,
        pdf_content: bytes,
        doc_name: str,
        record_id: Optional[str] = None
    ) -> BlocksContainer:
        """
        Process PDF and return BlocksContainer.

        This method:
        1. Runs OCRmyPDF to ensure text layer exists (if needed)
        2. Runs Docling for structure extraction
        3. Returns BlocksContainer with extracted blocks

        Args:
            pdf_content: PDF binary content
            doc_name: Document name
            record_id: Optional record ID

        Returns:
            BlocksContainer with extracted blocks

        Raises:
            ValueError: If processing fails
        """
        self.logger.info(f"🚀 Processing PDF: {doc_name}")

        # Ensure doc_name ends with .pdf
        record_name = doc_name if doc_name.endswith(".pdf") else f"{doc_name}.pdf"

        # STEP 1: Use OCRHandler to process PDF first (adds text layer if needed)
        self.logger.info("🔍 Step 1: Running OCRmyPDF to ensure text layer exists")
        ocr_handler = OCRHandler(
            self.logger,
            OCRProvider.OCRMYPDF.value,
            config=self.config
        )

        await ocr_handler.process_document(pdf_content)

        # STEP 2: Get the OCR'd PDF content (if OCR was performed)
        # If OCR was not needed, use the original PDF
        optimized_pdf_bytes = pdf_content
        if hasattr(ocr_handler.strategy, 'ocr_pdf_content') and ocr_handler.strategy.ocr_pdf_content:
            optimized_pdf_bytes = ocr_handler.strategy.ocr_pdf_content
            self.logger.info("📝 Using OCR-processed PDF with text layer")
        else:
            self.logger.info("📄 Using original PDF (no OCR needed or already has text)")

        # STEP 3: Pass the optimized PDF to Docling for structure extraction
        self.logger.info("🔄 Step 2: Running Docling for structure extraction")
        processor = DoclingProcessor(logger=self.logger, config=self.config)
        block_containers = await processor.load_document(record_name, optimized_pdf_bytes)

        if block_containers is False or block_containers is None:
            raise ValueError(f"Docling failed to process {doc_name}")

        self.logger.info(f"✅ Successfully processed PDF: {doc_name}")
        return block_containers


async def process_pdf(
    pdf_content: bytes,
    doc_name: str,
    logger,
    config,
    record_id: Optional[str] = None
) -> BlocksContainer:
    """
    Convenience function to process PDF.

    Args:
        pdf_content: PDF binary content
        doc_name: Document name
        logger: Logger instance
        config: Config service instance
        record_id: Optional record ID

    Returns:
        BlocksContainer with extracted blocks
    """
    processor = PDFProcessor(logger=logger, config=config)
    return await processor.process_pdf_to_blocks(
        pdf_content=pdf_content,
        doc_name=doc_name,
        record_id=record_id
    )
