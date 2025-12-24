from typing import Any, Dict, List, Optional

from docling.datamodel.document import DoclingDocument

from app.models.blocks import (
    Block,
    BlocksContainer,
    BlockType,
    CitationMetadata,
    DataFormat,
    Point,
)

DOCLING_PAGE_BLOCK_TYPE = "pages"
DOCLING_REF_NODE = "$ref"


class DoclingDocToBlocksConverter:
    """
    Convert Docling documents to BlocksContainer format.

    Extracts text with bounding boxes for grounding/highlighting support.
    """

    def __init__(self, logger, config) -> None:
        self.logger = logger
        self.config = config

    @staticmethod
    def _get_page_number(text_item) -> Optional[int]:
        """Try to extract a page number from a docling text item."""
        potential_sources = [
            getattr(text_item, "page_no", None),
            getattr(text_item, "page_num", None),
        ]

        for value in potential_sources:
            if isinstance(value, int):
                return value

        meta = getattr(text_item, "meta", None)
        if isinstance(meta, dict):
            for key in ("page_no", "page_num", "page_number", "page"):
                value = meta.get(key)
                if isinstance(value, int):
                    return value

        prov = getattr(text_item, "prov", None)
        if isinstance(prov, list) and prov:
            first_entry = prov[0]
            if isinstance(first_entry, dict):
                for key in ("page_no", "page_num", "page_number", "page"):
                    value = first_entry.get(key)
                    if isinstance(value, int):
                        return value
        return None

    @staticmethod
    def _extract_bounding_box(text_item) -> Optional[List[Point]]:
        """
        Extract bounding box from a docling text item.

        Returns 4 points in order: top-left, top-right, bottom-right, bottom-left
        """
        # Try to get bounding box from various possible locations

        # Method 1: Direct rect/bbox attribute
        rect = getattr(text_item, "rect", None) or getattr(text_item, "bbox", None)
        if rect:
            # Handle BoundingRectangle or similar objects
            if hasattr(rect, "l") and hasattr(rect, "t") and hasattr(rect, "r") and hasattr(rect, "b"):
                return [
                    Point(x=rect.l, y=rect.t),  # top-left
                    Point(x=rect.r, y=rect.t),  # top-right
                    Point(x=rect.r, y=rect.b),  # bottom-right
                    Point(x=rect.l, y=rect.b),  # bottom-left
                ]
            # Handle tuple/list format (x0, y0, x1, y1)
            if isinstance(rect, (list, tuple)) and len(rect) >= 4:
                x0, y0, x1, y1 = rect[:4]
                return [
                    Point(x=x0, y=y0),
                    Point(x=x1, y=y0),
                    Point(x=x1, y=y1),
                    Point(x=x0, y=y1),
                ]

        # Method 2: From prov (provenance) data
        prov = getattr(text_item, "prov", None)
        if isinstance(prov, list) and prov:
            first_entry = prov[0]
            if hasattr(first_entry, "bbox"):
                bbox = first_entry.bbox
                if hasattr(bbox, "l"):
                    return [
                        Point(x=bbox.l, y=bbox.t),
                        Point(x=bbox.r, y=bbox.t),
                        Point(x=bbox.r, y=bbox.b),
                        Point(x=bbox.l, y=bbox.b),
                    ]
            # Check for dict-style prov
            if isinstance(first_entry, dict):
                bbox = first_entry.get("bbox") or first_entry.get("bounding_box")
                if bbox:
                    if isinstance(bbox, dict):
                        return [
                            Point(x=bbox.get("l", 0), y=bbox.get("t", 0)),
                            Point(x=bbox.get("r", 0), y=bbox.get("t", 0)),
                            Point(x=bbox.get("r", 0), y=bbox.get("b", 0)),
                            Point(x=bbox.get("l", 0), y=bbox.get("b", 0)),
                        ]
                    elif isinstance(bbox, (list, tuple)) and len(bbox) >= 4:
                        x0, y0, x1, y1 = bbox[:4]
                        return [
                            Point(x=x0, y=y0),
                            Point(x=x1, y=y0),
                            Point(x=x1, y=y1),
                            Point(x=x0, y=y1),
                        ]

        return None

    @staticmethod
    def _extract_grounded_tokens(text_item) -> Optional[List[Dict[str, Any]]]:
        """
        Extract word-level grounded tokens from text item if available.

        Returns list of dicts: [{"text": "...", "bbox": [x1,y1,x2,y2], "page_index": 0}, ...]
        """
        # Check for grounded_tokens attribute (added by our grounding module)
        tokens = getattr(text_item, "grounded_tokens", None)
        if tokens:
            return [t if isinstance(t, dict) else t.to_dict() for t in tokens]

        # Check in metadata
        meta = getattr(text_item, "meta", None)
        if isinstance(meta, dict):
            tokens = meta.get("grounded_tokens")
            if tokens:
                return tokens

        return None

    async def convert(self, doc: DoclingDocument) -> BlocksContainer | bool:
        """
        Process Docling document into BlocksContainer.

        Extracts text blocks with bounding boxes for grounding support.
        """
        texts = doc.texts
        if texts == []:
            self.logger.info("No text blocks found in the document")
            return False

        blocks = []
        block_groups = []
        index = 0

        # Process text blocks
        for text_item in texts:
            text_content = getattr(text_item, "text", "")
            if text_content and text_content.strip():
                page_number = self._get_page_number(text_item)
                bounding_boxes = self._extract_bounding_box(text_item)
                grounded_tokens = self._extract_grounded_tokens(text_item)

                # Create citation metadata with bounding boxes
                citation_metadata = CitationMetadata(
                    page_number=page_number,
                    bounding_boxes=bounding_boxes,
                )

                # Create text block
                block = Block(
                    index=index,
                    type=BlockType.TEXT,
                    format=DataFormat.TXT,
                    data=text_content.strip(),
                    comments=[],
                    citation_metadata=citation_metadata,
                )

                # Store grounded tokens in semantic metadata if available
                if grounded_tokens:
                    from app.models.blocks import SemanticMetadata
                    block.semantic_metadata = SemanticMetadata()
                    # Store tokens as entities for now (can be refactored later)
                    block.semantic_metadata.entities = grounded_tokens

                blocks.append(block)
                index += 1

                self.logger.debug(
                    f"Block {index}: page={page_number}, "
                    f"bbox={'yes' if bounding_boxes else 'no'}, "
                    f"tokens={len(grounded_tokens) if grounded_tokens else 0}"
                )

        self.logger.info(f"Converted {len(blocks)} text blocks from Docling document")

        # Create BlocksContainer
        block_containers = BlocksContainer(blocks=blocks, block_groups=block_groups)
        return block_containers
