"""
Hierarchical Chunking Module with Parent-Child Context (Thero-Style).

This module implements markdown-aware chunking that preserves document structure
and supports the "Small-to-Big" retrieval strategy (Parent-Child Architecture).

Key features:
1. MarkdownHeaderTextSplitter: Splits by header hierarchy (H1 > H2 > H3)
2. Contextual Enrichment: Adds parent headers to each chunk
3. Logical Blocks: Creates semantic chunks instead of character-based splits
4. ParentChildChunker: Thero-style strategy separating search (children) from
   generation (parents) units

Architecture (Thero-Style):
    - Parent (Generation Unit): Large semantic chunks (2000-8000 chars) for LLM context
    - Child (Search Unit): Small chunks (~400-600 chars) for precise vector search
    - Each Child references its Parent via parent_id for resolution during retrieval

Example output chunk:
    "Projekthistorie > Microservices Refactoring (02/2023):

    Scalability: Befähigung der Plattform für 10.000+ Concurrent Users..."
"""

import logging
import re
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

_log = logging.getLogger(__name__)


class HeaderLevel(Enum):
    """Markdown header levels."""
    H1 = 1
    H2 = 2
    H3 = 3
    H4 = 4
    H5 = 5
    H6 = 6


@dataclass
class HeaderNode:
    """A header in the document hierarchy."""
    level: int
    text: str
    start_pos: int
    end_pos: Optional[int] = None
    children: List["HeaderNode"] = field(default_factory=list)
    content: str = ""

    def get_breadcrumb(self, ancestors: List["HeaderNode"] = None) -> str:
        """Get breadcrumb path like 'H1 > H2 > H3'."""
        if ancestors is None:
            ancestors = []

        parts = [a.text for a in ancestors] + [self.text]
        return " > ".join(parts)


@dataclass
class HierarchicalChunk:
    """A chunk with hierarchical context."""
    content: str
    raw_content: str  # Content without injected context
    headers: List[str]  # Header hierarchy [H1, H2, H3, ...]
    breadcrumb: str  # "H1 > H2 > H3"
    level: int  # Deepest header level
    start_pos: int
    end_pos: int
    page_index: Optional[int] = None
    bounding_boxes: Optional[List[Dict[str, float]]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "raw_content": self.raw_content,
            "headers": self.headers,
            "breadcrumb": self.breadcrumb,
            "level": self.level,
            "start_pos": self.start_pos,
            "end_pos": self.end_pos,
            "page_index": self.page_index,
            "bounding_boxes": self.bounding_boxes,
            "metadata": self.metadata,
        }


@dataclass
class ParentDocument:
    """
    Parent document (Generation Unit) for Thero-style retrieval.

    This is the large semantic chunk that gets passed to the LLM
    for answer generation. Contains full context with breadcrumbs.
    """
    id: str  # Unique ID for parent-child linking
    content: str  # Full content with breadcrumbs (for LLM)
    raw_content: str  # Raw content without breadcrumbs
    headers: List[str]  # Header hierarchy
    breadcrumb: str  # "H1 > H2 > H3"
    level: int  # Header level
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "content": self.content,
            "raw_content": self.raw_content,
            "headers": self.headers,
            "breadcrumb": self.breadcrumb,
            "level": self.level,
            "metadata": self.metadata,
        }


@dataclass
class ChildChunk:
    """
    Child chunk (Search Unit) for Thero-style retrieval.

    This is the small chunk that gets embedded and searched in the
    vector database. References its parent for context resolution.
    """
    id: str  # Unique ID for the child
    parent_id: str  # Reference to parent document
    content: str  # Small chunk content for embedding
    chunk_index: int  # Index within parent
    breadcrumb: str  # Parent's breadcrumb (for reranking)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "parent_id": self.parent_id,
            "content": self.content,
            "chunk_index": self.chunk_index,
            "breadcrumb": self.breadcrumb,
            "metadata": self.metadata,
        }


@dataclass
class ParentChildResult:
    """
    Result of Parent-Child chunking containing both units.

    - parents: Large documents for LLM generation (stored in doc store)
    - children: Small chunks for vector search (stored in vector DB)
    """
    parents: List[ParentDocument]
    children: List[ChildChunk]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "parents": [p.to_dict() for p in self.parents],
            "children": [c.to_dict() for c in self.children],
        }

    @property
    def parent_count(self) -> int:
        return len(self.parents)

    @property
    def child_count(self) -> int:
        return len(self.children)


class MarkdownHeaderParser:
    """
    Parse markdown headers and build document hierarchy.
    """

    # Regex patterns for markdown headers
    ATX_HEADER_PATTERN = re.compile(r'^(#{1,6})\s+(.+?)(?:\s*#*\s*)?$', re.MULTILINE)
    SETEXT_H1_PATTERN = re.compile(r'^(.+)\n={3,}\s*$', re.MULTILINE)
    SETEXT_H2_PATTERN = re.compile(r'^(.+)\n-{3,}\s*$', re.MULTILINE)

    # Pattern for bold text that might be a header (e.g., "**Section Title**")
    BOLD_HEADER_PATTERN = re.compile(r'^\*\*([^*]+)\*\*\s*$', re.MULTILINE)

    # Pattern for common non-markdown header indicators
    CAPS_HEADER_PATTERN = re.compile(r'^([A-ZÄÖÜ][A-ZÄÖÜ\s]{5,})\s*$', re.MULTILINE)

    def __init__(
        self,
        detect_bold_headers: bool = True,
        detect_caps_headers: bool = False,
        min_header_length: int = 2,
        max_header_length: int = 200,
    ):
        """
        Args:
            detect_bold_headers: Treat **bold lines** as headers
            detect_caps_headers: Treat ALL CAPS lines as headers
            min_header_length: Minimum header text length
            max_header_length: Maximum header text length
        """
        self.detect_bold_headers = detect_bold_headers
        self.detect_caps_headers = detect_caps_headers
        self.min_header_length = min_header_length
        self.max_header_length = max_header_length

    def _find_headers(self, text: str) -> List[Tuple[int, int, str, int]]:
        """
        Find all headers in text.

        Returns:
            List of (start_pos, end_pos, header_text, level)
        """
        headers = []

        # Find ATX headers (# Header)
        for match in self.ATX_HEADER_PATTERN.finditer(text):
            level = len(match.group(1))
            header_text = match.group(2).strip()
            if self.min_header_length <= len(header_text) <= self.max_header_length:
                headers.append((match.start(), match.end(), header_text, level))

        # Find Setext H1 (Header\n===)
        for match in self.SETEXT_H1_PATTERN.finditer(text):
            header_text = match.group(1).strip()
            if self.min_header_length <= len(header_text) <= self.max_header_length:
                headers.append((match.start(), match.end(), header_text, 1))

        # Find Setext H2 (Header\n---)
        for match in self.SETEXT_H2_PATTERN.finditer(text):
            header_text = match.group(1).strip()
            if self.min_header_length <= len(header_text) <= self.max_header_length:
                headers.append((match.start(), match.end(), header_text, 2))

        # Find bold headers if enabled
        if self.detect_bold_headers:
            for match in self.BOLD_HEADER_PATTERN.finditer(text):
                header_text = match.group(1).strip()
                if self.min_header_length <= len(header_text) <= self.max_header_length:
                    # Treat bold as H3 level
                    headers.append((match.start(), match.end(), header_text, 3))

        # Find ALL CAPS headers if enabled
        if self.detect_caps_headers:
            for match in self.CAPS_HEADER_PATTERN.finditer(text):
                header_text = match.group(1).strip()
                if self.min_header_length <= len(header_text) <= self.max_header_length:
                    # Treat caps as H2 level
                    headers.append((match.start(), match.end(), header_text, 2))

        # Sort by position and remove overlaps
        headers.sort(key=lambda x: x[0])

        # Remove overlapping headers (keep first)
        filtered = []
        last_end = -1
        for start, end, text, level in headers:
            if start >= last_end:
                filtered.append((start, end, text, level))
                last_end = end

        return filtered

    def build_hierarchy(self, text: str) -> List[HeaderNode]:
        """
        Build a hierarchical tree of headers.

        Args:
            text: Markdown text

        Returns:
            List of root-level HeaderNode objects
        """
        headers = self._find_headers(text)

        if not headers:
            # No headers found - return single node with full text
            return [HeaderNode(
                level=0,
                text="Document",
                start_pos=0,
                end_pos=len(text),
                content=text,
            )]

        # Build tree structure
        roots: List[HeaderNode] = []
        stack: List[HeaderNode] = []

        for i, (start, end, header_text, level) in enumerate(headers):
            # Determine content end (start of next header or end of text)
            if i + 1 < len(headers):
                content_end = headers[i + 1][0]
            else:
                content_end = len(text)

            # Extract content (text between header and next header)
            content = text[end:content_end].strip()

            node = HeaderNode(
                level=level,
                text=header_text,
                start_pos=start,
                end_pos=content_end,
                content=content,
            )

            # Find parent in stack
            while stack and stack[-1].level >= level:
                stack.pop()

            if stack:
                stack[-1].children.append(node)
            else:
                roots.append(node)

            stack.append(node)

        # Handle text before first header
        if headers[0][0] > 0:
            preamble = text[:headers[0][0]].strip()
            if preamble:
                preamble_node = HeaderNode(
                    level=0,
                    text="Introduction",
                    start_pos=0,
                    end_pos=headers[0][0],
                    content=preamble,
                )
                roots.insert(0, preamble_node)

        return roots


class MarkdownHeaderTextSplitter:
    """
    Split markdown text by headers while preserving hierarchy.

    Unlike character-based splitting, this creates semantic chunks
    based on document structure.
    """

    def __init__(
        self,
        chunk_by_level: int = 3,
        min_chunk_size: int = 50,
        max_chunk_size: int = 2000,
        include_breadcrumb: bool = True,
        breadcrumb_separator: str = " > ",
        detect_bold_headers: bool = True,
        detect_caps_headers: bool = False,
    ):
        """
        Args:
            chunk_by_level: Create chunks at this header level and below
                           (1=H1, 2=H2, 3=H3). Higher levels get merged.
            min_chunk_size: Minimum chunk size in characters
            max_chunk_size: Maximum chunk size before sub-splitting
            include_breadcrumb: Add breadcrumb context to chunks
            breadcrumb_separator: Separator for breadcrumb path
            detect_bold_headers: Treat **bold lines** as headers
            detect_caps_headers: Treat ALL CAPS lines as headers
        """
        self.chunk_by_level = chunk_by_level
        self.min_chunk_size = min_chunk_size
        self.max_chunk_size = max_chunk_size
        self.include_breadcrumb = include_breadcrumb
        self.breadcrumb_separator = breadcrumb_separator

        self.parser = MarkdownHeaderParser(
            detect_bold_headers=detect_bold_headers,
            detect_caps_headers=detect_caps_headers,
        )

    def _collect_chunks(
        self,
        node: HeaderNode,
        ancestors: List[HeaderNode],
    ) -> List[HierarchicalChunk]:
        """
        Recursively collect chunks from header tree.
        """
        chunks = []
        current_ancestors = ancestors + [node] if node.level > 0 else ancestors

        # If we're at or below chunk level, create a chunk
        if node.level >= self.chunk_by_level or (node.level == 0 and node.content):
            if node.content.strip():
                # Build headers list
                headers = [a.text for a in ancestors] + ([node.text] if node.level > 0 else [])
                breadcrumb = self.breadcrumb_separator.join(headers)

                # Build content with context
                if self.include_breadcrumb and breadcrumb:
                    content = f"{breadcrumb}:\n\n{node.content}"
                else:
                    content = node.content

                chunk = HierarchicalChunk(
                    content=content,
                    raw_content=node.content,
                    headers=headers,
                    breadcrumb=breadcrumb,
                    level=node.level,
                    start_pos=node.start_pos,
                    end_pos=node.end_pos or (node.start_pos + len(node.content)),
                )

                # Check if chunk needs sub-splitting
                if len(content) > self.max_chunk_size:
                    chunks.extend(self._sub_split_chunk(chunk))
                elif len(content) >= self.min_chunk_size:
                    chunks.append(chunk)

        # Process children
        for child in node.children:
            chunks.extend(self._collect_chunks(child, current_ancestors))

        return chunks

    def _sub_split_chunk(self, chunk: HierarchicalChunk) -> List[HierarchicalChunk]:
        """
        Sub-split a chunk that exceeds max_chunk_size.
        Uses paragraph boundaries for natural splitting.
        """
        content = chunk.raw_content
        paragraphs = re.split(r'\n\n+', content)

        chunks = []
        current_content = ""

        for para in paragraphs:
            if not para.strip():
                continue

            potential_content = current_content + ("\n\n" if current_content else "") + para

            # Check if adding this paragraph exceeds limit
            if len(potential_content) > self.max_chunk_size and current_content:
                # Save current chunk
                if self.include_breadcrumb and chunk.breadcrumb:
                    full_content = f"{chunk.breadcrumb}:\n\n{current_content}"
                else:
                    full_content = current_content

                chunks.append(HierarchicalChunk(
                    content=full_content,
                    raw_content=current_content,
                    headers=chunk.headers.copy(),
                    breadcrumb=chunk.breadcrumb,
                    level=chunk.level,
                    start_pos=chunk.start_pos,
                    end_pos=chunk.end_pos,
                    metadata=chunk.metadata.copy(),
                ))
                current_content = para
            else:
                current_content = potential_content

        # Add remaining content
        if current_content.strip():
            if self.include_breadcrumb and chunk.breadcrumb:
                full_content = f"{chunk.breadcrumb}:\n\n{current_content}"
            else:
                full_content = current_content

            chunks.append(HierarchicalChunk(
                content=full_content,
                raw_content=current_content,
                headers=chunk.headers.copy(),
                breadcrumb=chunk.breadcrumb,
                level=chunk.level,
                start_pos=chunk.start_pos,
                end_pos=chunk.end_pos,
                metadata=chunk.metadata.copy(),
            ))

        return chunks if chunks else [chunk]

    def split_text(self, text: str) -> List[HierarchicalChunk]:
        """
        Split markdown text into hierarchical chunks.

        Args:
            text: Markdown text to split

        Returns:
            List of HierarchicalChunk objects
        """
        # Build hierarchy
        roots = self.parser.build_hierarchy(text)

        # Collect chunks
        chunks = []
        for root in roots:
            chunks.extend(self._collect_chunks(root, []))

        _log.info(f"Split text into {len(chunks)} hierarchical chunks")
        return chunks

    def split_document(
        self,
        text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Split document and return LangChain-compatible format.

        Args:
            text: Markdown text
            metadata: Additional metadata to include

        Returns:
            List of dicts with 'page_content' and 'metadata' keys
        """
        chunks = self.split_text(text)

        documents = []
        for i, chunk in enumerate(chunks):
            doc_metadata = {
                "chunk_index": i,
                "headers": chunk.headers,
                "breadcrumb": chunk.breadcrumb,
                "header_level": chunk.level,
                "raw_content": chunk.raw_content,
            }

            if metadata:
                doc_metadata.update(metadata)

            documents.append({
                "page_content": chunk.content,
                "metadata": doc_metadata,
            })

        return documents


class ContextualEnricher:
    """
    Enrich text chunks with contextual information from parent sections.

    This makes isolated bullet points searchable by including their
    parent header context.
    """

    def __init__(
        self,
        context_separator: str = " > ",
        include_section_title: bool = True,
        include_document_title: bool = True,
        max_context_length: int = 200,
    ):
        """
        Args:
            context_separator: Separator for context path
            include_section_title: Include immediate parent section
            include_document_title: Include document/top-level title
            max_context_length: Maximum length for context prefix
        """
        self.context_separator = context_separator
        self.include_section_title = include_section_title
        self.include_document_title = include_document_title
        self.max_context_length = max_context_length

    def enrich_chunk(
        self,
        chunk_text: str,
        context_path: List[str],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Enrich a chunk with its context path.

        Args:
            chunk_text: Original chunk text
            context_path: List of parent headers [H1, H2, H3, ...]
            metadata: Optional existing metadata

        Returns:
            Tuple of (enriched_text, updated_metadata)
        """
        if not context_path:
            return chunk_text, metadata or {}

        # Build context prefix
        context = self.context_separator.join(context_path)

        # Truncate if too long
        if len(context) > self.max_context_length:
            # Keep first and last parts
            parts = context_path
            while len(self.context_separator.join(parts)) > self.max_context_length and len(parts) > 2:
                parts = [parts[0], "...", parts[-1]]
            context = self.context_separator.join(parts)

        # Build enriched text
        enriched_text = f"{context}:\n\n{chunk_text}"

        # Update metadata
        result_metadata = metadata.copy() if metadata else {}
        result_metadata.update({
            "context_path": context_path,
            "context_breadcrumb": context,
            "has_context": True,
        })

        return enriched_text, result_metadata

    def enrich_chunks(
        self,
        chunks: List[HierarchicalChunk],
    ) -> List[HierarchicalChunk]:
        """
        Enrich multiple chunks with their context.

        Note: HierarchicalChunks from MarkdownHeaderTextSplitter
        already have context, so this is mainly for post-processing
        or enriching plain chunks.
        """
        enriched = []
        for chunk in chunks:
            if not chunk.breadcrumb and chunk.headers:
                # Build breadcrumb from headers
                chunk.breadcrumb = self.context_separator.join(chunk.headers)

            if chunk.breadcrumb and chunk.breadcrumb not in chunk.content:
                # Add breadcrumb to content
                chunk.content = f"{chunk.breadcrumb}:\n\n{chunk.raw_content}"

            enriched.append(chunk)

        return enriched


class ParentChildChunker:
    """
    Thero-Style Parent-Child Chunking Strategy (Small-to-Big Retrieval).

    This implements the separation of:
    - Search Units (Children): Small chunks (~400-600 chars) for precise vector search
    - Generation Units (Parents): Large semantic blocks (2000-8000 chars) for LLM context

    The key insight: What you SEARCH for should be different from what you GENERATE with.

    Workflow:
    1. Create large semantic Parents using MarkdownHeaderTextSplitter
    2. Split each Parent into small Children for vector search
    3. Each Child stores a reference (parent_id) to its Parent
    4. During retrieval: Search Children → Resolve to Parents → Pass Parents to LLM

    Benefits:
    - Precise search: Small chunks reduce noise in vector similarity
    - Rich context: LLM receives complete semantic sections
    - Deduplication: Multiple child hits from same parent = one context block

    Example:
        >>> chunker = ParentChildChunker(
        ...     parent_chunk_size=4000,  # Large for LLM context
        ...     child_chunk_size=400,    # Small for precise search
        ... )
        >>> result = chunker.process_markdown(markdown_text)
        >>> # result.parents -> store in doc store (Redis, SQL, etc.)
        >>> # result.children -> embed and store in vector DB
    """

    def __init__(
        self,
        # Parent (Generation Unit) settings
        parent_chunk_size: int = 4000,
        parent_min_size: int = 200,
        chunk_by_level: int = 3,
        # Child (Search Unit) settings
        child_chunk_size: int = 400,
        child_chunk_overlap: int = 50,
        child_min_size: int = 50,
        # General settings
        include_breadcrumb_in_parent: bool = True,
        include_breadcrumb_in_child: bool = False,
        breadcrumb_separator: str = " > ",
        detect_bold_headers: bool = True,
        detect_caps_headers: bool = False,
    ):
        """
        Initialize the Parent-Child Chunker.

        Args:
            parent_chunk_size: Max size for parent chunks (Generation Units)
            parent_min_size: Min size for parent chunks
            chunk_by_level: Header level for structural chunking (1=H1, 2=H2, 3=H3)
            child_chunk_size: Target size for child chunks (Search Units)
            child_chunk_overlap: Overlap between consecutive children
            child_min_size: Min size for child chunks (skip smaller)
            include_breadcrumb_in_parent: Add "H1 > H2 > H3:" prefix to parents
            include_breadcrumb_in_child: Add breadcrumb prefix to children
            breadcrumb_separator: Separator for breadcrumb path
            detect_bold_headers: Treat **bold lines** as headers
            detect_caps_headers: Treat ALL CAPS lines as headers
        """
        self.parent_chunk_size = parent_chunk_size
        self.parent_min_size = parent_min_size
        self.chunk_by_level = chunk_by_level
        self.child_chunk_size = child_chunk_size
        self.child_chunk_overlap = child_chunk_overlap
        self.child_min_size = child_min_size
        self.include_breadcrumb_in_parent = include_breadcrumb_in_parent
        self.include_breadcrumb_in_child = include_breadcrumb_in_child
        self.breadcrumb_separator = breadcrumb_separator

        # Initialize the parent splitter (structural, markdown-aware)
        self.parent_splitter = MarkdownHeaderTextSplitter(
            chunk_by_level=chunk_by_level,
            min_chunk_size=parent_min_size,
            max_chunk_size=parent_chunk_size,
            include_breadcrumb=include_breadcrumb_in_parent,
            breadcrumb_separator=breadcrumb_separator,
            detect_bold_headers=detect_bold_headers,
            detect_caps_headers=detect_caps_headers,
        )

    def _split_into_children(
        self,
        text: str,
        parent_id: str,
        breadcrumb: str,
        base_metadata: Dict[str, Any],
    ) -> List[ChildChunk]:
        """
        Split parent text into small child chunks for vector search.

        Uses recursive character splitting with overlap for smooth transitions.
        Respects sentence and paragraph boundaries where possible.

        Args:
            text: Parent's raw content (without breadcrumb)
            parent_id: ID of the parent document
            breadcrumb: Parent's breadcrumb for metadata
            base_metadata: Additional metadata to include

        Returns:
            List of ChildChunk objects
        """
        children = []

        if not text or len(text.strip()) < self.child_min_size:
            return children

        # Split by paragraphs first for natural boundaries
        paragraphs = re.split(r'\n\n+', text)

        current_chunk = ""
        chunk_index = 0

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # Check if adding this paragraph exceeds chunk size
            potential_chunk = current_chunk + ("\n\n" if current_chunk else "") + para

            if len(potential_chunk) > self.child_chunk_size and current_chunk:
                # Save current chunk as child
                if len(current_chunk) >= self.child_min_size:
                    child_content = current_chunk
                    if self.include_breadcrumb_in_child and breadcrumb:
                        child_content = f"{breadcrumb}:\n\n{current_chunk}"

                    children.append(ChildChunk(
                        id=str(uuid.uuid4()),
                        parent_id=parent_id,
                        content=child_content,
                        chunk_index=chunk_index,
                        breadcrumb=breadcrumb,
                        metadata={
                            **base_metadata,
                            "char_start": len(text) - len(current_chunk) - len(para),
                        },
                    ))
                    chunk_index += 1

                # Start new chunk, possibly with overlap from previous
                if self.child_chunk_overlap > 0 and current_chunk:
                    # Take last N chars as overlap
                    overlap_text = current_chunk[-self.child_chunk_overlap:]
                    # Try to start at word boundary
                    space_idx = overlap_text.find(' ')
                    if space_idx > 0:
                        overlap_text = overlap_text[space_idx + 1:]
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    current_chunk = para
            else:
                current_chunk = potential_chunk

        # Don't forget the last chunk
        if current_chunk and len(current_chunk) >= self.child_min_size:
            child_content = current_chunk
            if self.include_breadcrumb_in_child and breadcrumb:
                child_content = f"{breadcrumb}:\n\n{current_chunk}"

            children.append(ChildChunk(
                id=str(uuid.uuid4()),
                parent_id=parent_id,
                content=child_content,
                chunk_index=chunk_index,
                breadcrumb=breadcrumb,
                metadata=base_metadata.copy(),
            ))

        # If paragraphs are too large, do sentence-level splitting
        if not children and text:
            children = self._split_by_sentences(
                text, parent_id, breadcrumb, base_metadata
            )

        return children

    def _split_by_sentences(
        self,
        text: str,
        parent_id: str,
        breadcrumb: str,
        base_metadata: Dict[str, Any],
    ) -> List[ChildChunk]:
        """
        Fallback: Split by sentences when paragraphs are too large.
        """
        children = []

        # Simple sentence splitting (can be enhanced with spaCy if available)
        sentence_pattern = re.compile(r'(?<=[.!?])\s+(?=[A-ZÄÖÜ])')
        sentences = sentence_pattern.split(text)

        current_chunk = ""
        chunk_index = 0

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            potential_chunk = current_chunk + (" " if current_chunk else "") + sentence

            if len(potential_chunk) > self.child_chunk_size and current_chunk:
                if len(current_chunk) >= self.child_min_size:
                    child_content = current_chunk
                    if self.include_breadcrumb_in_child and breadcrumb:
                        child_content = f"{breadcrumb}:\n\n{current_chunk}"

                    children.append(ChildChunk(
                        id=str(uuid.uuid4()),
                        parent_id=parent_id,
                        content=child_content,
                        chunk_index=chunk_index,
                        breadcrumb=breadcrumb,
                        metadata=base_metadata.copy(),
                    ))
                    chunk_index += 1

                current_chunk = sentence
            else:
                current_chunk = potential_chunk

        # Last chunk
        if current_chunk and len(current_chunk) >= self.child_min_size:
            child_content = current_chunk
            if self.include_breadcrumb_in_child and breadcrumb:
                child_content = f"{breadcrumb}:\n\n{current_chunk}"

            children.append(ChildChunk(
                id=str(uuid.uuid4()),
                parent_id=parent_id,
                content=child_content,
                chunk_index=chunk_index,
                breadcrumb=breadcrumb,
                metadata=base_metadata.copy(),
            ))

        return children

    def process_chunks(
        self,
        parent_chunks: List[HierarchicalChunk],
        base_metadata: Optional[Dict[str, Any]] = None,
    ) -> ParentChildResult:
        """
        Process hierarchical chunks into Parent-Child structure.

        Takes existing HierarchicalChunks (from MarkdownHeaderTextSplitter)
        and creates the Thero-style Parent-Child separation.

        Args:
            parent_chunks: List of HierarchicalChunks as parent sources
            base_metadata: Additional metadata for all chunks

        Returns:
            ParentChildResult with parents and children lists
        """
        parents = []
        children = []
        base_meta = base_metadata or {}

        for chunk in parent_chunks:
            # Create unique ID for parent
            parent_id = str(uuid.uuid4())

            # Create Parent document (Generation Unit)
            parent = ParentDocument(
                id=parent_id,
                content=chunk.content,  # With breadcrumb
                raw_content=chunk.raw_content,  # Without breadcrumb
                headers=chunk.headers,
                breadcrumb=chunk.breadcrumb,
                level=chunk.level,
                metadata={
                    **base_meta,
                    **chunk.metadata,
                    "start_pos": chunk.start_pos,
                    "end_pos": chunk.end_pos,
                    "page_index": chunk.page_index,
                    "bounding_boxes": chunk.bounding_boxes,
                },
            )
            parents.append(parent)

            # Create Children (Search Units) from this parent
            chunk_children = self._split_into_children(
                text=chunk.raw_content,
                parent_id=parent_id,
                breadcrumb=chunk.breadcrumb,
                base_metadata={
                    **base_meta,
                    "parent_headers": chunk.headers,
                    "parent_level": chunk.level,
                },
            )
            children.extend(chunk_children)

        _log.info(
            f"✅ ParentChildChunker: Created {len(parents)} parents "
            f"and {len(children)} children"
        )

        return ParentChildResult(parents=parents, children=children)

    def process_markdown(
        self,
        markdown_text: str,
        base_metadata: Optional[Dict[str, Any]] = None,
    ) -> ParentChildResult:
        """
        Process markdown text directly into Parent-Child structure.

        This is the main entry point for processing raw markdown.

        Args:
            markdown_text: Raw markdown text to process
            base_metadata: Additional metadata for all chunks

        Returns:
            ParentChildResult with parents and children lists

        Example:
            >>> chunker = ParentChildChunker()
            >>> result = chunker.process_markdown(markdown_text)
            >>>
            >>> # Store parents in document store
            >>> for parent in result.parents:
            ...     doc_store.set(parent.id, parent.content)
            >>>
            >>> # Embed and store children in vector DB
            >>> for child in result.children:
            ...     embedding = embed(child.content)
            ...     vector_db.upsert(child.id, embedding, {"parent_id": child.parent_id})
        """
        # Step 1: Create structural parents using markdown-aware splitting
        structural_chunks = self.parent_splitter.split_text(markdown_text)

        if not structural_chunks:
            _log.warning("No chunks created from markdown text")
            return ParentChildResult(parents=[], children=[])

        # Step 2: Process into Parent-Child structure
        return self.process_chunks(structural_chunks, base_metadata)

    def get_stats(self, result: ParentChildResult) -> Dict[str, Any]:
        """
        Get statistics about the chunking result.

        Useful for debugging and optimization.
        """
        parent_sizes = [len(p.content) for p in result.parents]
        child_sizes = [len(c.content) for c in result.children]

        return {
            "parent_count": len(result.parents),
            "child_count": len(result.children),
            "children_per_parent": len(result.children) / max(len(result.parents), 1),
            "avg_parent_size": sum(parent_sizes) / max(len(parent_sizes), 1),
            "avg_child_size": sum(child_sizes) / max(len(child_sizes), 1),
            "min_parent_size": min(parent_sizes) if parent_sizes else 0,
            "max_parent_size": max(parent_sizes) if parent_sizes else 0,
            "min_child_size": min(child_sizes) if child_sizes else 0,
            "max_child_size": max(child_sizes) if child_sizes else 0,
        }


def create_parent_child_chunks(
    markdown_text: str,
    parent_chunk_size: int = 4000,
    child_chunk_size: int = 400,
    child_overlap: int = 50,
    metadata: Optional[Dict[str, Any]] = None,
) -> ParentChildResult:
    """
    High-level function to create Thero-style Parent-Child chunks.

    This is the recommended entry point for the Small-to-Big strategy.

    Args:
        markdown_text: Input markdown text
        parent_chunk_size: Max size for parent (Generation Unit)
        child_chunk_size: Target size for child (Search Unit)
        child_overlap: Overlap between consecutive children
        metadata: Additional metadata for all chunks

    Returns:
        ParentChildResult with parents and children

    Example:
        >>> result = create_parent_child_chunks(markdown_text)
        >>> print(f"Parents: {result.parent_count}, Children: {result.child_count}")
    """
    chunker = ParentChildChunker(
        parent_chunk_size=parent_chunk_size,
        child_chunk_size=child_chunk_size,
        child_chunk_overlap=child_overlap,
    )

    return chunker.process_markdown(markdown_text, metadata)


def create_hierarchical_chunks(
    markdown_text: str,
    chunk_by_level: int = 3,
    min_chunk_size: int = 50,
    max_chunk_size: int = 2000,
    metadata: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    High-level function to create hierarchical chunks from markdown.

    Args:
        markdown_text: Input markdown text
        chunk_by_level: Header level for chunking (1-6)
        min_chunk_size: Minimum chunk size
        max_chunk_size: Maximum chunk size
        metadata: Additional metadata for all chunks

    Returns:
        List of LangChain-compatible document dicts
    """
    splitter = MarkdownHeaderTextSplitter(
        chunk_by_level=chunk_by_level,
        min_chunk_size=min_chunk_size,
        max_chunk_size=max_chunk_size,
        include_breadcrumb=True,
    )

    return splitter.split_document(markdown_text, metadata)


def detect_document_structure(text: str) -> Dict[str, Any]:
    """
    Analyze document structure and return statistics.

    Useful for determining optimal chunking parameters.
    """
    parser = MarkdownHeaderParser(
        detect_bold_headers=True,
        detect_caps_headers=True,
    )

    headers = parser._find_headers(text)
    roots = parser.build_hierarchy(text)

    # Count headers by level
    level_counts = {}
    for _, _, _, level in headers:
        level_counts[level] = level_counts.get(level, 0) + 1

    # Calculate average section length
    section_lengths = []
    for i, (start, end, _, _) in enumerate(headers):
        if i + 1 < len(headers):
            section_lengths.append(headers[i + 1][0] - end)
        else:
            section_lengths.append(len(text) - end)

    avg_section_length = sum(section_lengths) / len(section_lengths) if section_lengths else len(text)

    return {
        "total_headers": len(headers),
        "level_counts": level_counts,
        "max_depth": max(level_counts.keys()) if level_counts else 0,
        "avg_section_length": avg_section_length,
        "total_length": len(text),
        "root_sections": len(roots),
    }

