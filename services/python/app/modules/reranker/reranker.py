import logging
from typing import Any, Dict, List, Optional

import torch
from sentence_transformers import CrossEncoder

from app.models.blocks import BlockType, GroupType

_log = logging.getLogger(__name__)


class RerankerService:
    """
    Service for reranking retrieval results using Cross-Encoder models.

    Supports both legacy block-based documents and Parent-Child (Thero-style) documents.
    For Parent-Child documents, reranks using the full parent content for better precision.
    """

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2") -> None:
        """
        Initialize the reranker service with a specific model

        Args:
            model_name: Name of the reranker model to use
                Options include:
                - "cross-encoder/ms-marco-MiniLM-L-6-v2" (fast)
                - "BAAI/bge-reranker-base" (balanced)
                - "BAAI/bge-reranker-large" (more accurate)
        """
        self.model_name = model_name
        # Load model with half precision for faster inference if supported
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = CrossEncoder(model_name, device=self.device)

        # For faster inference with larger batch sizes on GPU
        if self.device == "cuda":
            self.model.model = self.model.model.half()

        _log.info(f"⚖️ RerankerService initialized with {model_name} on {self.device}")

    def _get_rerank_content(self, doc: Dict[str, Any]) -> Optional[str]:
        """
        Extract content for reranking from a document.

        Handles both legacy block-based documents and Parent-Child documents.
        For Parent-Child docs, uses the full parent content (already resolved).

        Args:
            doc: Document dictionary

        Returns:
            Content string for reranking, or None if not suitable
        """
        # Check if this is an image (skip)
        block_type = doc.get("block_type")
        if block_type == BlockType.IMAGE.value:
            return None

        # Get content - for Parent-Child docs, this is already the parent content
        content = doc.get("content", "")

        # Handle table content (list of rows)
        if block_type == GroupType.TABLE.value and isinstance(content, (list, tuple)):
            content = content[0] if content else ""

        # For Parent-Child resolved docs, ensure we use parent content
        metadata = doc.get("metadata", {})
        if metadata.get("parent_resolved"):
            # Content should already be parent content after resolution
            # But if somehow child_content is in main content, prefer parent
            _log.debug(f"Reranking parent-resolved doc: {metadata.get('parent_breadcrumb', 'N/A')}")

        # Validate content
        if not content or not isinstance(content, str):
            return None

        # Truncate very long content to avoid memory issues
        # Cross-encoders typically have 512 token limit
        max_chars = 2000  # ~500 tokens
        if len(content) > max_chars:
            content = content[:max_chars] + "..."

        return content

    async def rerank(
        self, query: str, documents: List[Dict[str, Any]], top_k: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents based on relevance to the query.

        Uses a Cross-Encoder to compute relevance scores between the query
        and each document. For Parent-Child documents, this operates on the
        full parent content (after resolution), providing precision filtering
        after the broad vector search recall.

        Args:
            query: The search query
            documents: List of document dictionaries from the retriever
            top_k: Number of top documents to return (None for all)

        Returns:
            Reranked list of documents with scores
        """
        if not documents:
            return []

        _log.info(f"⚖️ Reranking {len(documents)} documents for query: '{query[:50]}...'")

        # Create document-query pairs for scoring
        doc_query_pairs = []
        doc_indices = []  # Track which docs have pairs

        for idx, doc in enumerate(documents):
            content = self._get_rerank_content(doc)
            if content:
                doc_query_pairs.append((query, content))
                doc_indices.append(idx)

        # If no valid document-query pairs, return documents as-is
        if not doc_query_pairs:
            _log.warning("⚠️ No valid content for reranking, returning original order")
            for doc in documents:
                doc["reranker_score"] = 0.0
                doc["final_score"] = doc.get("score", 0.0)
            return documents

        # Get relevance scores from Cross-Encoder
        try:
            scores = self.model.predict(doc_query_pairs)
            _log.debug(f"Cross-encoder scores: min={min(scores):.3f}, max={max(scores):.3f}")
        except Exception as e:
            _log.error(f"❌ Reranking failed: {str(e)}")
            for doc in documents:
                doc["reranker_score"] = 0.0
                doc["final_score"] = doc.get("score", 0.0)
            return documents

        # Add scores to documents
        score_idx = 0
        for idx, doc in enumerate(documents):
            if idx in doc_indices:
                reranker_score = float(scores[score_idx])
                doc["reranker_score"] = reranker_score

                # Combine vector score with reranker score
                # Reranker is more precise, so weight it higher
                vector_score = doc.get("score", 0.0)
                doc["final_score"] = 0.3 * vector_score + 0.7 * reranker_score

                # Track parent-child info for debugging
                metadata = doc.get("metadata", {})
                if metadata.get("parent_resolved"):
                    doc["rerank_info"] = {
                        "parent_id": metadata.get("parent_id"),
                        "matched_children": metadata.get("matched_children_count", 1),
                        "child_score": metadata.get("child_score", vector_score),
                    }

                score_idx += 1
            else:
                # No content to rerank (e.g., images)
                doc["reranker_score"] = 0.0
                doc["final_score"] = doc.get("score", 0.0)

        # Sort by final score
        reranked_docs = sorted(
            documents, key=lambda d: d.get("final_score", 0), reverse=True
        )

        if reranked_docs:
            top_score = reranked_docs[0].get("final_score", 0)
            _log.info(f"✅ Reranking complete. Top score: {top_score:.3f}")

        # Return top_k if specified
        if top_k is not None:
            reranked_docs = reranked_docs[:top_k]

        return reranked_docs

    def reorder_for_llm(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Reorder documents to mitigate "Lost in the Middle" problem.

        LLMs tend to focus on content at the beginning and end of the context,
        while "forgetting" information in the middle. This function reorders
        documents so the most relevant ones appear at both ends.

        Input (sorted by score):  [1, 2, 3, 4, 5]  (1 = best)
        Output (for LLM):         [1, 3, 5, 4, 2]  (best at start and end)

        Args:
            documents: List of documents sorted by relevance (best first)

        Returns:
            Reordered list optimized for LLM attention patterns
        """
        if len(documents) < 3:
            return documents

        # Split into two groups and interleave
        # Odd indices go to front, even indices (except 0) go to back reversed
        reordered = []
        back_buffer = []

        for i, doc in enumerate(documents):
            if i == 0:
                # Best document always first
                reordered.append(doc)
            elif i % 2 == 1:
                # Odd indices (3rd best, 5th best) go to front
                reordered.append(doc)
            else:
                # Even indices (2nd best, 4th best) go to back buffer
                back_buffer.append(doc)

        # Reverse back buffer so 2nd best is at the very end
        back_buffer.reverse()
        reordered.extend(back_buffer)

        _log.debug(
            f"Reordered {len(documents)} docs for LLM: "
            f"original ranks → positions: {list(range(1, len(documents) + 1))} → "
            f"{[documents.index(d) + 1 for d in reordered]}"
        )

        return reordered
