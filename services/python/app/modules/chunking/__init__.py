"""
Chunking module for document processing.

Provides hierarchical, markdown-aware chunking with context preservation.
"""

from app.modules.chunking.hierarchical_chunker import (
    ContextualEnricher,
    HeaderLevel,
    HeaderNode,
    HierarchicalChunk,
    MarkdownHeaderParser,
    MarkdownHeaderTextSplitter,
    create_hierarchical_chunks,
    detect_document_structure,
)

__all__ = [
    "ContextualEnricher",
    "HeaderLevel",
    "HeaderNode",
    "HierarchicalChunk",
    "MarkdownHeaderParser",
    "MarkdownHeaderTextSplitter",
    "create_hierarchical_chunks",
    "detect_document_structure",
]

