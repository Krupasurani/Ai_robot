"""
Debug utilities for saving intermediate processing results.

This module provides functions to save debug outputs during PDF processing:
- Raw Docling output (JSON from the processing)
- OCR output as markdown
- Pre-chunking input (full text before chunking)
- Post-chunking output (chunks after chunking)

Configure via environment variable:
    DEBUG_OUTPUT_DIR=/home/debug  (default: /tmp/pdf_debug)
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain.schema import Document

logger = logging.getLogger(__name__)


def get_debug_output_dir() -> Optional[Path]:
    """
    Get the debug output directory, creating it if necessary.

    Falls back to /tmp/pdf_debug if the configured directory cannot be created.
    Returns None if no writable directory can be found.
    """
    configured_dir = os.getenv("DEBUG_OUTPUT_DIR", "/tmp/pdf_debug")
    debug_dir = Path(configured_dir)

    try:
        debug_dir.mkdir(parents=True, exist_ok=True)
        # Verify the directory is writable by attempting to create a test file
        test_file = debug_dir / ".debug_write_test"
        try:
            test_file.touch()
            test_file.unlink()
        except (OSError, PermissionError) as e:
            raise OSError(f"Directory {debug_dir} is not writable: {e}")
        return debug_dir
    except (OSError, PermissionError) as e:
        # Fall back to /tmp/pdf_debug if configured directory fails
        fallback_dir = Path("/tmp/pdf_debug")
        logger.warning(
            f"⚠️ Failed to use configured debug directory {debug_dir}: {e}. "
            f"Falling back to {fallback_dir}"
        )
        try:
            fallback_dir.mkdir(parents=True, exist_ok=True)
            # Verify fallback directory is writable
            test_file = fallback_dir / ".debug_write_test"
            test_file.touch()
            test_file.unlink()
            return fallback_dir
        except Exception as fallback_error:
            logger.error(
                f"⚠️ Failed to create fallback debug directory {fallback_dir}: {fallback_error}. "
                f"Debug output will be disabled."
            )
            # Return None to indicate debug output is unavailable
            return None


def is_debug_enabled() -> bool:
    """Check if debug output is enabled via environment variable."""
    return os.getenv("ENABLE_DEBUG_OUTPUT", "false").lower() == "true"


def save_docling_raw_output(
    doc_name: str,
    raw_response: Dict[str, Any],
    record_id: Optional[str] = None,
) -> str:
    """
    Save raw Docling response (JSON from the processing).

    This captures the output directly from Docling processing BEFORE any
    transformation to BlocksContainer or chunking.

    Args:
        doc_name: Name of the document
        raw_response: Raw JSON response from Docling processing
        record_id: Optional record ID for file naming

    Returns:
        Path to the saved file
    """
    if not is_debug_enabled():
        return ""

    try:
        debug_dir = get_debug_output_dir()
        # Check if debug directory is available
        if debug_dir is None or not debug_dir.exists():
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create sanitized filename
        safe_name = "".join(c for c in doc_name if c.isalnum() or c in ("-", "_", "."))[:50]
        record_suffix = f"_{record_id[:20]}" if record_id else ""
        filename = f"docling_raw_{safe_name}{record_suffix}_{timestamp}.json"

        file_path = debug_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(raw_response, f, indent=2, ensure_ascii=False, default=str)

        return str(file_path)
    except Exception as e:
        logger.warning(f"⚠️ Failed to save docling raw output: {e}")
        return ""


def save_ocr_output_markdown(
    doc_name: str,
    markdown_content: str,
    record_id: Optional[str] = None,
) -> str:
    """
    Save OCR output as markdown file.

    Args:
        doc_name: Name of the document
        markdown_content: Markdown content from OCR
        record_id: Optional record ID for file naming

    Returns:
        Path to the saved file (empty string if debug disabled)
    """
    if not is_debug_enabled():
        return ""

    try:
        debug_dir = get_debug_output_dir()
        # Check if debug directory is available
        if debug_dir is None or not debug_dir.exists():
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create sanitized filename
        safe_name = "".join(c for c in doc_name if c.isalnum() or c in ("-", "_", "."))[:50]
        record_suffix = f"_{record_id[:20]}" if record_id else ""
        filename = f"ocr_output_{safe_name}{record_suffix}_{timestamp}.md"

        file_path = debug_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        return str(file_path)
    except Exception as e:
        logger.warning(f"⚠️ Failed to save OCR output: {e}")
        return ""


def save_pre_chunking_input(
    doc_name: str,
    full_text: str,
    record_id: Optional[str] = None,
) -> str:
    """
    Save pre-chunking input (full text before chunking).

    Args:
        doc_name: Name of the document
        full_text: Full text content before chunking
        record_id: Optional record ID for file naming

    Returns:
        Path to the saved file (empty string if debug disabled)
    """
    if not is_debug_enabled():
        return ""

    try:
        debug_dir = get_debug_output_dir()
        # Check if debug directory is available
        if debug_dir is None or not debug_dir.exists():
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create sanitized filename
        safe_name = "".join(c for c in doc_name if c.isalnum() or c in ("-", "_", "."))[:50]
        record_suffix = f"_{record_id[:20]}" if record_id else ""
        filename = f"pre_chunking_{safe_name}{record_suffix}_{timestamp}.txt"

        file_path = debug_dir / filename

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(full_text)

        return str(file_path)
    except Exception as e:
        logger.warning(f"⚠️ Failed to save pre-chunking input: {e}")
        return ""


def save_post_chunking_output(
    doc_name: str,
    chunks: List[Document],
    record_id: Optional[str] = None,
) -> str:
    """
    Save post-chunking output (chunks after chunking).

    Args:
        doc_name: Name of the document
        chunks: List of Document chunks after chunking
        record_id: Optional record ID for file naming

    Returns:
        Path to the saved file (empty string if debug disabled)
    """
    if not is_debug_enabled():
        return ""

    try:
        debug_dir = get_debug_output_dir()
        # Check if debug directory is available
        if debug_dir is None or not debug_dir.exists():
            return ""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Create sanitized filename
        safe_name = "".join(c for c in doc_name if c.isalnum() or c in ("-", "_", "."))[:50]
        record_suffix = f"_{record_id[:20]}" if record_id else ""
        filename = f"post_chunking_{safe_name}{record_suffix}_{timestamp}.json"

        file_path = debug_dir / filename

        # Convert chunks to serializable format
        chunks_data = []
        for i, chunk in enumerate(chunks):
            chunk_data = {
                "chunk_index": i,
                "page_content": chunk.page_content,
                "metadata": chunk.metadata,
            }
            chunks_data.append(chunk_data)

        output = {
            "total_chunks": len(chunks),
            "chunks": chunks_data,
        }

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        return str(file_path)
    except Exception as e:
        logger.warning(f"⚠️ Failed to save post-chunking output: {e}")
        return ""

