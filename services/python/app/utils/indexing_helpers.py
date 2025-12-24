"""
Helper functions for document indexing and PDF processing.
"""

import base64
from typing import Any, Dict, List, Optional, Tuple

import fitz


def _normalize_bbox(
    bbox: Tuple[float, float, float, float],
    page_width: float,
    page_height: float
) -> List[Dict[str, float]]:
    """
    Normalize a bounding box from absolute coordinates to relative [0, 1] coordinates.

    Args:
        bbox: Tuple of (x0, y0, x1, y1) in absolute coordinates
        page_width: Width of the page
        page_height: Height of the page

    Returns:
        List of 4 corner points as dicts with 'x' and 'y' keys, normalized to [0, 1]
        Order: top-left, top-right, bottom-right, bottom-left
    """
    x0, y0, x1, y1 = bbox

    # Normalize to [0, 1] range
    norm_x0 = x0 / page_width if page_width > 0 else 0
    norm_y0 = y0 / page_height if page_height > 0 else 0
    norm_x1 = x1 / page_width if page_width > 0 else 0
    norm_y1 = y1 / page_height if page_height > 0 else 0

    return [
        {"x": norm_x0, "y": norm_y0},  # top-left
        {"x": norm_x1, "y": norm_y0},  # top-right
        {"x": norm_x1, "y": norm_y1},  # bottom-right
        {"x": norm_x0, "y": norm_y1},  # bottom-left
    ]


def image_bytes_to_base64(image_bytes: bytes, ext: str) -> str:
    """
    Convert image bytes to a base64 data URI.

    Args:
        image_bytes: Raw image bytes
        ext: Image extension (e.g., 'png', 'jpg', 'jpeg', 'webp')

    Returns:
        Base64 data URI string
    """
    # Normalize extension
    ext = ext.lower()
    if ext == "jpg":
        ext = "jpeg"

    mime_type = f"image/{ext}"
    base64_encoded = base64.b64encode(image_bytes).decode("utf-8")

    return f"data:{mime_type};base64,{base64_encoded}"


async def process_table_pymupdf(
    page: fitz.Page,
    result: Dict[str, Any],
    config: Any,
    page_number: int
) -> None:
    """
    Process tables from a PyMuPDF page and add them to the result.

    Args:
        page: PyMuPDF page object
        result: Dictionary to add table data to
        config: Configuration object
        page_number: 1-indexed page number
    """
    try:
        # Try to find tables using PyMuPDF's table detection
        tables = page.find_tables()

        if not tables or len(tables.tables) == 0:
            return

        page_width = page.rect.width
        page_height = page.rect.height

        for table in tables.tables:
            # Extract table data
            table_data = table.extract()

            if not table_data:
                continue

            # Get table bounding box
            bbox = table.bbox if hasattr(table, 'bbox') else None
            normalized_bbox = None
            if bbox:
                normalized_bbox = _normalize_bbox(bbox, page_width, page_height)

            # Build table content as HTML or markdown for downstream processing
            table_content = _table_data_to_markdown(table_data)

            table_block = {
                "type": "table",
                "content": table_content,
                "page_number": page_number,
                "bounding_box": normalized_bbox,
                "rows": len(table_data),
                "columns": len(table_data[0]) if table_data else 0,
                "raw_data": table_data,
            }

            result["tables"].append(table_block)

    except Exception:
        # Table detection might not be available or might fail
        # Silently ignore as tables are optional
        pass


def _table_data_to_markdown(table_data: List[List[Optional[str]]]) -> str:
    """
    Convert table data to markdown format.

    Args:
        table_data: 2D list of cell values

    Returns:
        Markdown formatted table string
    """
    if not table_data:
        return ""

    lines = []

    for row_idx, row in enumerate(table_data):
        # Clean and join cells
        cells = [str(cell).strip() if cell else "" for cell in row]
        line = "| " + " | ".join(cells) + " |"
        lines.append(line)

        # Add header separator after first row
        if row_idx == 0:
            separator = "| " + " | ".join(["---"] * len(cells)) + " |"
            lines.append(separator)

    return "\n".join(lines)
