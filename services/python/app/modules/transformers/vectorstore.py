import asyncio
import logging
import os
import time
from typing import Any, Dict, List, Optional, Tuple

import spacy
from langchain.chat_models.base import BaseChatModel
from langchain.schema import Document, HumanMessage
from langchain_qdrant import FastEmbedSparse, QdrantVectorStore, RetrievalMode
from qdrant_client.http.models import PointStruct
from spacy.language import Language
from spacy.tokens import Doc

from app.exceptions.indexing_exceptions import (
    DocumentProcessingError,
    EmbeddingError,
    IndexingError,
    MetadataProcessingError,
    VectorStoreError,
)
from app.models.blocks import BlocksContainer
from app.modules.chunking.hierarchical_chunker import (
    MarkdownHeaderTextSplitter,
    ParentChildChunker,
    ParentChildResult,
    detect_document_structure,
)
from app.modules.extraction.prompt_template import prompt_for_image_description
from app.modules.transformers.transformer import TransformContext, Transformer
from app.utils.aimodels import (
    get_embedding_model,
)
from app.utils.debug_utils import save_post_chunking_output, save_pre_chunking_input
from app.utils.llm import get_llm
from libs.core.constants import CollectionNames, MimeTypes
from libs.core.constants import ConfigPath as config_node_constants
from libs.core.utils import get_epoch_timestamp_in_ms
from libs.data.vector import IVectorDBService

_log = logging.getLogger(__name__)

# Module-level shared spaCy pipeline to avoid repeated heavy loads
_SHARED_NLP: Optional[Language] = None

def _get_shared_nlp() -> Language:
    # Avoid global mutation; attach cache to function attribute
    cached = getattr(_get_shared_nlp, "_cached_nlp", None)
    if cached is None:
        nlp = spacy.load("en_core_web_sm")
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer", before="parser")
        if "custom_sentence_boundary" not in nlp.pipe_names:
            try:
                nlp.add_pipe("custom_sentence_boundary", after="sentencizer")
            except Exception:
                pass
        setattr(_get_shared_nlp, "_cached_nlp", nlp)
        return nlp
    return cached

LENGTH_THRESHOLD = 2
OUTPUT_DIMENSION = 1536
HTTP_OK = 200
_DEFAULT_DOCUMENT_BATCH_SIZE = 100
_DEFAULT_CONCURRENCY_LIMIT = 5

class VectorStore(Transformer):

    def __init__(
        self,
        logger,
        config_service,
        arango_service,
        collection_name: str,
        vector_db_service: IVectorDBService,
    ) -> None:
        super().__init__()
        self.logger = logger
        self.config_service = config_service
        self.arango_service = arango_service
        # Reuse a single spaCy pipeline across instances to avoid memory bloat
        self.nlp = _get_shared_nlp()
        self.vector_db_service = vector_db_service
        self.collection_name = collection_name
        self.vector_store = None
        self.dense_embeddings = None
        self.api_key = None
        self.model_name = None
        self.embedding_provider = None
        self.is_multimodal_embedding = False
        self.region_name = None
        self.aws_access_key_id = None
        self.aws_secret_access_key = None

        try:
            # Initialize sparse embeddings
            try:
                self.sparse_embeddings = FastEmbedSparse(model_name="Qdrant/BM25")
            except Exception as e:
                raise IndexingError(
                    "Failed to initialize sparse embeddings: " + str(e),
                    details={"error": str(e)},
                )



        except (IndexingError, VectorStoreError):
            raise
        except Exception as e:
            raise IndexingError(
                "Failed to initialize indexing pipeline: " + str(e),
                details={"error": str(e)},
            )

    async def apply(self, ctx: TransformContext) -> bool|None:
        record = ctx.record
        record_id = record.id
        virtual_record_id = record.virtual_record_id
        block_containers = record.block_containers
        org_id = record.org_id
        mime_type = record.mime_type
        result = await self.index_documents(block_containers, org_id,record_id,virtual_record_id,mime_type)
        return result

    @Language.component("custom_sentence_boundary")
    def custom_sentence_boundary(doc) -> Doc:
        for token in doc[:-1]:  # Avoid out-of-bounds errors
            next_token = doc[token.i + 1]

            # If token is a number and followed by a period, don't treat it as a sentence boundary
            if token.like_num and next_token.text == ".":
                next_token.is_sent_start = False
            # Handle common abbreviations
            elif (
                token.text.lower()
                in [
                    "mr",
                    "mrs",
                    "dr",
                    "ms",
                    "prof",
                    "sr",
                    "jr",
                    "inc",
                    "ltd",
                    "co",
                    "etc",
                    "vs",
                    "fig",
                    "et",
                    "al",
                    "e.g",
                    "i.e",
                    "vol",
                    "pg",
                    "pp",
                    "pvt",
                    "llc",
                    "llp",
                    "lp",
                    "ll",
                    "ltd",
                    "inc",
                    "corp",
                ]
                and next_token.text == "."
            ):
                next_token.is_sent_start = False
            # Handle bullet points and list markers
            elif (
                # Numeric bullets with period (1., 2., etc)
                (
                    token.like_num and next_token.text == "." and len(token.text) <= LENGTH_THRESHOLD
                )  # Limit to 2 digits
                or
                # Letter bullets with period (a., b., etc)
                (
                    len(token.text) == 1
                    and token.text.isalpha()
                    and next_token.text == "."
                )
                or
                # Common bullet point markers
                token.text in ["•", "∙", "·", "○", "●", "-", "–", "—"]
            ):
                next_token.is_sent_start = False

            # Check for potential headings (all caps or title case without period)
            elif (
                # All caps text likely a heading
                token.text.isupper()
                and len(token.text) > 1  # Avoid single letters
                and not any(c.isdigit() for c in token.text)  # Avoid serial numbers
            ):
                if next_token.i < len(doc) - 1:
                    next_token.is_sent_start = False

            # Handle ellipsis (...) - don't split
            elif token.text == "." and next_token.text == ".":
                next_token.is_sent_start = False
        return doc

    def _create_custom_tokenizer(self, nlp) -> Language:
        """
        Creates a custom tokenizer that handles special cases for sentence boundaries.
        """
        # Add the custom rule to the pipeline
        if "sentencizer" not in nlp.pipe_names:
            nlp.add_pipe("sentencizer", before="parser")

        # Add custom sentence boundary detection
        if "custom_sentence_boundary" not in nlp.pipe_names:
            nlp.add_pipe("custom_sentence_boundary", after="sentencizer")

        # Configure the tokenizer to handle special cases
        special_cases = {
            "e.g.": [{"ORTH": "e.g."}],
            "i.e.": [{"ORTH": "i.e."}],
            "etc.": [{"ORTH": "etc."}],
            "...": [{"ORTH": "..."}],
        }

        for case, mapping in special_cases.items():
            nlp.tokenizer.add_special_case(case, mapping)
        return nlp

    async def _initialize_collection(
        self, embedding_size: int = 1024, sparse_idf: bool = False
    ) -> None:
        """Initialize Qdrant collection with proper configuration."""
        try:
            collection_info = await self.vector_db_service.get_collection(self.collection_name)
            current_vector_size = collection_info.config.params.vectors["dense"].size
            # current_vector_size_2 = collection_info.config.params.vectors["dense-1536"].size

            if current_vector_size != embedding_size:
                self.logger.warning(
                    f"Collection {self.collection_name} has size {current_vector_size}, but {embedding_size} is required."
                    " Recreating collection."
                )
                await self.vector_db_service.delete_collection(self.collection_name)
                raise Exception(
                    "Recreating collection due to vector dimension mismatch."
                )
        except Exception:
            self.logger.info(
                f"Collection {self.collection_name} not found, creating new collection"
            )
            try:
                await self.vector_db_service.create_collection(
                    embedding_size=embedding_size,
                    collection_name=self.collection_name,
                    sparse_idf=sparse_idf,
                )
                self.logger.info(
                    f"✅ Successfully created collection {self.collection_name}"
                )
                await self.vector_db_service.create_index(
                    collection_name=self.collection_name,
                    field_name="metadata.virtualRecordId",
                    field_schema={
                        "type": "keyword",
                    },
                )
                await self.vector_db_service.create_index(
                    collection_name=self.collection_name,
                    field_name="metadata.orgId",
                    field_schema={
                        "type": "keyword",
                    },
                )
                # ACL Push-Down: Index for access control list to enable fast permission filtering
                await self.vector_db_service.create_index(
                    collection_name=self.collection_name,
                    field_name="metadata.access_control_list",
                    field_schema={
                        "type": "keyword",
                    },
                )
            except Exception as e:
                self.logger.error(
                    f"❌ Error creating collection {self.collection_name}: {str(e)}"
                )
                raise VectorStoreError(
                    "Failed to create collection",
                    details={"collection": self.collection_name, "error": str(e)},
                )



    async def get_embedding_model_instance(self) -> bool:
        try:
            self.logger.info("Getting embedding model")
            # Return cached configuration if already initialized
            # if getattr(self, "vector_store", None) is not None and getattr(self, "dense_embeddings", None) is not None:
                # return bool(getattr(self, "is_multimodal_embedding", False))

            dense_embeddings = None
            ai_models = await self.config_service.get_config(
                config_node_constants.AI_MODELS.value,use_cache=False
            )
            embedding_configs = ai_models.get("embedding", []) if ai_models else []
            is_multimodal = False
            provider = None
            model_name = None
            configuration = None
            if not embedding_configs:
                raise IndexingError(
                    "No embedding configuration found. Please configure an OpenAI or OpenAI-compatible embedding provider.",
                    details={"error": "Missing embedding configuration"},
                )
            else:
                config = embedding_configs[0]
                provider = config["provider"]
                configuration = config["configuration"]
                model_names = [name.strip() for name in configuration["model"].split(",") if name.strip()]
                model_name = model_names[0]
                dense_embeddings = get_embedding_model(provider, config)
                is_multimodal = config.get("isMultimodal")
            # Get the embedding dimensions from the model
            try:
                sample_embedding = dense_embeddings.embed_query("test")
                embedding_size = len(sample_embedding)
            except Exception as e:
                self.logger.warning(
                    f"Error with configured embedding model, falling back to default: {str(e)}"
                )
                raise IndexingError(
                    "Failed to get embedding model: " + str(e),
                    details={"error": str(e)},
                )

            # Get model name safely
            model_name = None
            if hasattr(dense_embeddings, "model_name"):
                model_name = dense_embeddings.model_name
            elif hasattr(dense_embeddings, "model"):
                model_name = dense_embeddings.model
            elif hasattr(dense_embeddings, "model_id"):
                model_name = dense_embeddings.model_id
            else:
                model_name = "unknown"

            self.logger.info(
                f"Using embedding model: {model_name}, embedding_size: {embedding_size}"
            )

            # Initialize collection with correct embedding size
            await self._initialize_collection(embedding_size=embedding_size)

            # Initialize vector store with same configuration

            self.vector_store: QdrantVectorStore = QdrantVectorStore(
                client=self.vector_db_service.get_service_client(),
                collection_name=self.collection_name,
                vector_name="dense",
                sparse_vector_name="sparse",
                embedding=dense_embeddings,
                sparse_embedding=self.sparse_embeddings,
                retrieval_mode=RetrievalMode.HYBRID,
            )

            self.dense_embeddings = dense_embeddings
            self.embedding_provider = provider
            self.api_key = configuration["apiKey"] if configuration and "apiKey" in configuration else None
            self.model_name = model_name
            self.is_multimodal_embedding = bool(is_multimodal)
            return self.is_multimodal_embedding
        except IndexingError as e:
            self.logger.error(f"Error getting embedding model: {str(e)}")
            raise IndexingError(
                "Failed to get embedding model: " + str(e), details={"error": str(e)}
            )

    async def delete_embeddings(self, virtual_record_id: str) -> None:
        try:
            filter_dict = await self.vector_db_service.filter_collection(
                must={"virtualRecordId": virtual_record_id}
            )

            self.vector_db_service.delete_points(self.collection_name, filter_dict)

            self.logger.info(f"✅ Successfully deleted embeddings for record {virtual_record_id}")
        except Exception as e:
            self.logger.error(f"Error deleting embeddings: {str(e)}")
            raise EmbeddingError(f"Failed to delete embeddings: {str(e)}")

    async def _process_image_embeddings(
        self, image_chunks: List[dict], image_base64s: List[str]
    ) -> List[PointStruct]:
        """Process image embeddings.

        Note: OpenAI embedding models do not support native image embeddings.
        Image content is handled via text descriptions generated by vision models.
        """
        self.logger.warning(
            f"Image embeddings not supported for provider: {self.embedding_provider}. "
            "OpenAI embedding models require text input. Images will be skipped."
        )
        return []

    async def _store_image_points(self, points: List[PointStruct]) -> None:
        """Store image embedding points in the vector database."""
        if points:
            start_time = time.perf_counter()
            self.logger.info(f"⏱️ Starting image embeddings insertion for {len(points)} points")

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                None,
                lambda: self.vector_db_service.upsert_points(
                    collection_name=self.collection_name, points=points
                ),
            )

            elapsed_time = time.perf_counter() - start_time
            self.logger.info(
                f"✅ Successfully added {len(points)} image embeddings to vector store in {elapsed_time:.2f}s"
            )

        else:
            self.logger.info(
                "No image embeddings to upsert; all images were skipped or failed to embed"
            )

    async def _process_document_chunks(self, langchain_document_chunks: List[Document]) -> None:
        """Process and store document chunks in the vector store."""
        time.perf_counter()
        self.logger.info(f"⏱️ Starting langchain document embeddings insertion for {len(langchain_document_chunks)} documents")

        batch_size = _DEFAULT_DOCUMENT_BATCH_SIZE

        async def process_document_batch(batch_start: int, batch_documents: List[Document]) -> int:
            """Process a single batch of documents."""
            try:
                await self.vector_store.aadd_documents(batch_documents)
                self.logger.info(
                    f"✅ Processed document batch starting at {batch_start}: {len(batch_documents)} documents"
                )
                return len(batch_documents)
            except Exception as batch_error:
                self.logger.warning(
                    f"Failed to process document batch starting at {batch_start}: {str(batch_error)}"
                )
                raise

        batches = []
        for batch_start in range(0, len(langchain_document_chunks), batch_size):
            batch_end = min(batch_start + batch_size, len(langchain_document_chunks))
            batch_documents = langchain_document_chunks[batch_start:batch_end]
            batches.append((batch_start, batch_documents))

        concurrency_limit = _DEFAULT_CONCURRENCY_LIMIT
        semaphore = asyncio.Semaphore(concurrency_limit)

        async def limited_process_batch(batch_start: int, batch_documents: List[Document]) -> int:
            async with semaphore:
                return await process_document_batch(batch_start, batch_documents)

        tasks = [limited_process_batch(start, docs) for start, docs in batches]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                self.logger.error(f"Document batch {i} failed: {str(result)}")
                raise VectorStoreError(
                    f"Failed to store document batch {i} in vector store: {str(result)}",
                    details={"error": str(result), "batch_index": i},
                )

    async def _update_record_status(
        self, chunks: List[Document], record_id: str
    ) -> None:
        """Update record indexing status in the database."""
        if not chunks:
            return

        meta = chunks[0].metadata if isinstance(chunks[0], Document) else chunks[0].get("metadata", {})
        record = await self.arango_service.get_document(
            record_id, CollectionNames.RECORDS.value
        )
        if not record:
            raise DocumentProcessingError(
                "Record not found in database",
                doc_id=record_id,
            )

        doc = dict(record)
        doc.update(
            {
                "indexingStatus": "COMPLETED",
                "isDirty": False,
                "lastIndexTimestamp": get_epoch_timestamp_in_ms(),
                "virtualRecordId": meta.get("virtualRecordId"),
            }
        )

        docs = [doc]

        success = await self.arango_service.batch_upsert_nodes(
            docs, CollectionNames.RECORDS.value
        )

        if not success:
            raise DocumentProcessingError(
                "Failed to update indexing status", doc_id=record_id
            )

    async def _create_embeddings(
        self, chunks: List[Document], record_id: str, virtual_record_id: str
    ) -> None:
        """
        Create both sparse and dense embeddings for document chunks and store them in vector store.
        Handles both text and image embeddings.

        Args:
            chunks: List of document chunks to embed
            record_id: Record ID for status updates
            virtual_record_id: Virtual record ID for filtering embeddings

        Raises:
            EmbeddingError: If there's an error creating embeddings
        """
        try:
            # Validate input
            if not chunks:
                raise EmbeddingError("No chunks provided for embedding creation")

            # Separate chunks by type
            langchain_document_chunks = []
            image_chunks = []
            for chunk in chunks:
                if isinstance(chunk, Document):
                    langchain_document_chunks.append(chunk)
                else:
                    image_chunks.append(chunk)

            await self.delete_embeddings(virtual_record_id)

            self.logger.info(
                f"📊 Processing {len(langchain_document_chunks)} langchain document chunks and {len(image_chunks)} image chunks"
            )

            # Process image chunks if any
            if image_chunks:
                image_base64s = [chunk.get("image_uri") for chunk in image_chunks]
                points = await self._process_image_embeddings(image_chunks, image_base64s)
                await self._store_image_points(points)

            # Process document chunks if any
            if langchain_document_chunks:
                await self._process_document_chunks(langchain_document_chunks)

            # Update record status
            await self._update_record_status(chunks, record_id)

        except (
            EmbeddingError,
            VectorStoreError,
            MetadataProcessingError,
            DocumentProcessingError,
        ):
            raise
        except Exception as e:
            raise IndexingError(
                "Unexpected error during embedding creation: " + str(e),
                details={"error_type": type(e).__name__},
            )

    async def describe_image_async(self, base64_string: str, vlm: BaseChatModel) -> str:
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt_for_image_description},
                {"type": "image_url", "image_url": {"url": base64_string}},
            ]
        )
        response = await vlm.ainvoke([message])
        return response.content

    async def describe_images(self, base64_images: List[str],vlm:BaseChatModel) -> List[dict]:

        async def describe(i: int, base64_string: str) -> dict:
            try:
                description = await self.describe_image_async(base64_string, vlm)
                return {"index": i, "success": True, "description": description.strip()}
            except Exception as e:
                return {"index": i, "success": False, "error": str(e)}

        # Limit concurrency to avoid memory growth when many images
        concurrency_limit = 10
        semaphore = asyncio.Semaphore(concurrency_limit)

        async def limited_describe(i: int, base64_string: str) -> dict:
            async with semaphore:
                return await describe(i, base64_string)

        tasks = [limited_describe(i, img) for i, img in enumerate(base64_images)]
        results = await asyncio.gather(*tasks)
        return results

    def _create_hierarchical_chunks(
        self,
        text_blocks: List,
        base_metadata: Dict[str, Any],
        use_hierarchical: bool = True,
    ) -> List[Document]:
        """
        Create hierarchical chunks from text blocks using markdown-aware splitting.

        This preserves document structure and injects parent context into each chunk,
        enabling better retrieval for nested content (e.g., bullet points under headers).

        Args:
            text_blocks: List of text blocks from document
            base_metadata: Base metadata to include in all chunks
            use_hierarchical: If True, uses markdown-aware splitting; otherwise sentence-level

        Returns:
            List of Document objects ready for embedding
        """
        documents = []

        # Check if hierarchical chunking is enabled
        enable_hierarchical = os.getenv("ENABLE_HIERARCHICAL_CHUNKING", "true").lower() == "true"
        if not enable_hierarchical or not use_hierarchical:
            # Fall back to sentence-level chunking
            return self._create_sentence_chunks(text_blocks, base_metadata)

        # Combine all text blocks into a single markdown document for structure analysis
        combined_text = "\n\n".join(
            block.data for block in text_blocks if block.data
        )

        if not combined_text.strip():
            return documents

        # Analyze document structure to determine chunking strategy
        structure = detect_document_structure(combined_text)
        _log.info(
            f"📊 Document structure: {structure['total_headers']} headers, "
            f"max depth {structure['max_depth']}, "
            f"avg section {structure['avg_section_length']:.0f} chars"
        )

        # Determine optimal chunk level based on structure
        chunk_level = 3  # Default: chunk at H3 level
        if structure['total_headers'] == 0:
            # No headers found - fall back to sentence chunking
            _log.info("📝 No markdown headers found, using sentence-level chunking")
            return self._create_sentence_chunks(text_blocks, base_metadata)
        elif structure['avg_section_length'] > 2000:
            # Large sections - chunk at H2 level
            chunk_level = 2
        elif structure['avg_section_length'] < 200:
            # Small sections - chunk at H4 level or merge
            chunk_level = 4

        # Create hierarchical splitter
        splitter = MarkdownHeaderTextSplitter(
            chunk_by_level=chunk_level,
            min_chunk_size=50,
            max_chunk_size=2000,
            include_breadcrumb=True,
            breadcrumb_separator=" > ",
            detect_bold_headers=True,
        )

        # Split into hierarchical chunks
        chunks = splitter.split_text(combined_text)

        _log.info(f"✅ Created {len(chunks)} hierarchical chunks")

        # Convert to Document objects with metadata
        for i, chunk in enumerate(chunks):
            # Build metadata with hierarchical context
            chunk_metadata = {
                **base_metadata,
                "chunkIndex": i,
                "isBlock": True,
                "isHierarchical": True,
                "breadcrumb": chunk.breadcrumb,
                "headers": chunk.headers,
                "headerLevel": chunk.level,
                "rawContent": chunk.raw_content[:500] if chunk.raw_content else "",  # Truncate for storage
            }

            # Add bounding box info if available from the source blocks
            # Find which block(s) this chunk came from based on position
            for block in text_blocks:
                if block.data and chunk.raw_content in block.data:
                    if block.citation_metadata:
                        if block.citation_metadata.page_number:
                            chunk_metadata["pageNum"] = block.citation_metadata.page_number
                        if block.citation_metadata.bounding_boxes:
                            chunk_metadata["bounding_box"] = [
                                {"x": p.x, "y": p.y}
                                for p in block.citation_metadata.bounding_boxes
                            ]
                    break

            documents.append(
                Document(
                    page_content=chunk.content,
                    metadata=chunk_metadata,
                )
            )

        return documents

    def _create_parent_child_chunks(
        self,
        text_blocks: List,
        base_metadata: Dict[str, Any],
    ) -> Tuple[List[Document], List[Dict[str, Any]]]:
        """
        Create Thero-style Parent-Child chunks for Small-to-Big retrieval.

        This implements the separation of:
        - Children (Search Units): Small chunks for precise vector search
        - Parents (Generation Units): Large semantic blocks for LLM context

        The children are embedded and searched; when found, we resolve to their
        parents to provide rich context to the LLM.

        Args:
            text_blocks: List of text blocks from document
            base_metadata: Base metadata to include in all chunks

        Returns:
            Tuple of (child_documents, parent_documents)
            - child_documents: List[Document] for vector embedding (small chunks)
            - parent_documents: List[Dict] for doc store (large context blocks)
        """
        child_documents = []
        parent_documents = []

        # Combine all text blocks into a single markdown document
        combined_text = "\n\n".join(
            block.data for block in text_blocks if block.data
        )

        if not combined_text.strip():
            return child_documents, parent_documents

        # Get chunk sizes from environment or use defaults
        parent_chunk_size = int(os.getenv("PARENT_CHUNK_SIZE", "4000"))
        child_chunk_size = int(os.getenv("CHILD_CHUNK_SIZE", "400"))
        child_chunk_overlap = int(os.getenv("CHILD_CHUNK_OVERLAP", "50"))

        # Analyze document structure
        structure = detect_document_structure(combined_text)
        _log.info(
            f"📊 Document structure for Parent-Child: {structure['total_headers']} headers, "
            f"avg section {structure['avg_section_length']:.0f} chars"
        )

        # Determine chunk level based on structure
        chunk_level = 3  # Default H3
        if structure['avg_section_length'] > 3000:
            chunk_level = 2  # Use H2 for very long sections
        elif structure['avg_section_length'] < 300:
            chunk_level = 4  # Use H4 for short sections

        # Create Parent-Child chunker
        chunker = ParentChildChunker(
            parent_chunk_size=parent_chunk_size,
            parent_min_size=100,
            chunk_by_level=chunk_level,
            child_chunk_size=child_chunk_size,
            child_chunk_overlap=child_chunk_overlap,
            child_min_size=50,
            include_breadcrumb_in_parent=True,
            include_breadcrumb_in_child=False,  # Save tokens, use metadata
        )

        # Process markdown into Parent-Child structure
        result: ParentChildResult = chunker.process_markdown(
            combined_text,
            base_metadata={
                "source": base_metadata.get("virtualRecordId", "unknown"),
            }
        )

        stats = chunker.get_stats(result)
        _log.info(
            f"✅ Parent-Child Chunking: {stats['parent_count']} parents, "
            f"{stats['child_count']} children, "
            f"avg {stats['children_per_parent']:.1f} children/parent"
        )

        # Convert Parents to storage format (for doc store / payload)
        for parent in result.parents:
            parent_doc = {
                "id": parent.id,
                "content": parent.content,
                "raw_content": parent.raw_content,
                "breadcrumb": parent.breadcrumb,
                "headers": parent.headers,
                "level": parent.level,
                "metadata": {
                    **base_metadata,
                    **parent.metadata,
                    "isParent": True,
                    "isChild": False,
                },
            }
            parent_documents.append(parent_doc)

        # Convert Children to LangChain Documents for embedding
        # NOTE: Children only store parent_id reference, NOT parent_content
        # Parents are stored in ArangoDB and resolved during retrieval
        for child in result.children:
            child_metadata = {
                **base_metadata,
                "parent_id": child.parent_id,  # Reference to parent in ArangoDB
                "chunk_index": child.chunk_index,
                "breadcrumb": child.breadcrumb,  # For display/reranking
                "isParent": False,
                "isChild": True,
                "isHierarchical": True,
                **child.metadata,
            }

            # Add bounding box info if available
            for block in text_blocks:
                if block.data and child.content in combined_text:
                    if block.citation_metadata:
                        if block.citation_metadata.page_number:
                            child_metadata["pageNum"] = block.citation_metadata.page_number
                        if block.citation_metadata.bounding_boxes:
                            child_metadata["bounding_box"] = [
                                {"x": p.x, "y": p.y}
                                for p in block.citation_metadata.bounding_boxes
                            ]
                    break

            child_documents.append(
                Document(
                    page_content=child.content,
                    metadata=child_metadata,
                )
            )

        return child_documents, parent_documents

    async def _store_parent_chunks(
        self,
        parent_documents: List[Dict[str, Any]],
        virtual_record_id: str,
        org_id: str,
    ) -> None:
        """
        Store parent chunks in ArangoDB for later resolution.

        Parents are stored separately from children (which go to Qdrant).
        During retrieval, children reference parents via parent_id.

        Args:
            parent_documents: List of parent document dicts
            virtual_record_id: Record identifier for grouping
            org_id: Organization ID for ACL
        """
        if not parent_documents:
            return

        try:
            # First, delete existing parents for this record (re-indexing case)
            await self._delete_parent_chunks(virtual_record_id)

            # Prepare documents for ArangoDB
            arango_docs = []
            for parent in parent_documents:
                arango_doc = {
                    "_key": parent["id"],  # Use parent_id as document key
                    "parent_id": parent["id"],
                    "content": parent["content"],
                    "raw_content": parent["raw_content"],
                    "breadcrumb": parent["breadcrumb"],
                    "headers": parent["headers"],
                    "level": parent["level"],
                    "virtualRecordId": virtual_record_id,
                    "orgId": org_id,
                    "metadata": parent.get("metadata", {}),
                    "createdAt": get_epoch_timestamp_in_ms(),
                }
                arango_docs.append(arango_doc)

            # Batch upsert to ArangoDB
            success = await self.arango_service.batch_upsert_nodes(
                arango_docs,
                CollectionNames.PARENT_CHUNKS.value,
            )

            if success:
                self.logger.info(
                    f"✅ Stored {len(arango_docs)} parent chunks in ArangoDB "
                    f"for record {virtual_record_id}"
                )
            else:
                self.logger.warning(
                    f"⚠️ Failed to store parent chunks for record {virtual_record_id}"
                )

        except Exception as e:
            self.logger.error(f"❌ Error storing parent chunks: {str(e)}")
            # Don't fail the whole indexing - parents are for enrichment
            # Children can still work without parents (degraded mode)

    async def _delete_parent_chunks(self, virtual_record_id: str) -> None:
        """
        Delete existing parent chunks for a record (for re-indexing).

        Args:
            virtual_record_id: Record identifier
        """
        try:
            # Use AQL to delete all parents for this record
            aql = f"""
                FOR doc IN {CollectionNames.PARENT_CHUNKS.value}
                    FILTER doc.virtualRecordId == @virtualRecordId
                    REMOVE doc IN {CollectionNames.PARENT_CHUNKS.value}
            """
            self.arango_service.db.aql.execute(
                aql,
                bind_vars={"virtualRecordId": virtual_record_id}
            )
            self.logger.debug(f"🗑️ Deleted existing parent chunks for {virtual_record_id}")
        except Exception as e:
            # Collection might not exist yet, that's OK
            self.logger.debug(f"Note: Could not delete parent chunks: {str(e)}")

    def _create_sentence_chunks(
        self,
        text_blocks: List,
        base_metadata: Dict[str, Any],
    ) -> List[Document]:
        """
        Fall back to sentence-level chunking when hierarchical is not suitable.

        This is the original chunking logic.
        """
        documents = []

        for block in text_blocks:
            block_text = block.data
            if not block_text:
                continue

            metadata = {
                **base_metadata,
                "blockIndex": block.index,
                "isBlockGroup": False,
            }

            # Add bounding box and page info from citation metadata
            if block.citation_metadata:
                if block.citation_metadata.page_number:
                    metadata["pageNum"] = block.citation_metadata.page_number
                if block.citation_metadata.bounding_boxes:
                    metadata["bounding_box"] = [
                        {"x": p.x, "y": p.y}
                        for p in block.citation_metadata.bounding_boxes
                    ]

            # Use spaCy for sentence splitting
            doc = self.nlp(block_text)
            sentences = [sent.text for sent in doc.sents]

            if len(sentences) > 1:
                for sentence in sentences:
                    documents.append(
                        Document(
                            page_content=sentence,
                            metadata={
                                **metadata,
                                "isBlock": False,
                            },
                        )
                    )

            # Always add the full block
            documents.append(
                Document(
                    page_content=block_text,
                    metadata={
                        **metadata,
                        "isBlock": True,
                    },
                )
            )

        return documents

    async def index_documents(
        self,
        block_containers: BlocksContainer,
        org_id: str,
        record_id: str,
        virtual_record_id: str,
        mime_type: str,
    ) -> List[Document]|None|bool:
        """
        Main method to index documents through the entire pipeline.
        Args:
            sentences: List of dictionaries containing text and metadata
                    Each dict should have 'text' and 'metadata' keys

        Raises:
            DocumentProcessingError: If there's an error processing the documents
            ChunkingError: If there's an error during document chunking
            EmbeddingError: If there's an error creating embeddings
        """

        try:
          is_multimodal_embedding = await self.get_embedding_model_instance()
        except Exception as e:
                raise IndexingError(
                    "Failed to get embedding model instance: " + str(e),
                    details={"error": str(e)},
                )

        try:
            llm, config = await get_llm(self.config_service)
            is_multimodal_llm = config.get("isMultimodal")
        except Exception as e:
            raise IndexingError(
                "Failed to get LLM: " + str(e),
                details={"error": str(e)},
            )

        # ACL Push-Down: Fetch permissions for this record to embed in vector payloads
        try:
            access_control_list = await self.arango_service.get_record_permissions(
                record_id=record_id,
                org_id=org_id
            )
            self.logger.debug(
                f"🔐 ACL Push-Down: Record {record_id} has {len(access_control_list)} principals"
            )
        except Exception as e:
            self.logger.warning(
                f"⚠️ Failed to fetch permissions for record {record_id}, using empty ACL: {str(e)}"
            )
            access_control_list = []

        blocks = block_containers.blocks
        block_groups = block_containers.block_groups
        try:
            if not blocks and not block_groups:
                return None

            # Separate blocks by type
            text_blocks = []
            image_blocks = []
            table_blocks = []

            for block in blocks:
                block_type = block.type

                if block_type.lower() in [
                    "text",
                    "paragraph",
                    "textsection",
                    "heading",
                    "quote",
                ]:
                    text_blocks.append(block)
                elif (
                    block_type.lower() in ["image", "drawing"]
                    and isinstance(block.data, dict)
                    and block.data.get("uri")
                ):
                    image_blocks.append(block)
                elif block_type.lower() in ["table", "table_row", "table_cell"]:
                    table_blocks.append(block)

            for block_group in block_groups:
                if block_group.type.lower() in ["table"]:
                    table_blocks.append(block_group)


            documents_to_embed = []

            # Base metadata with ACL for all documents
            base_metadata = {
                "virtualRecordId": virtual_record_id,
                "orgId": org_id,
                "access_control_list": access_control_list,  # ACL Push-Down
            }

            # Process text blocks - choose chunking strategy
            # Parent-Child (Thero-style) separates search (children) from generation (parents)
            parent_documents = []  # For doc store (large context blocks)

            if text_blocks:
                try:
                    # Check which chunking strategy to use
                    use_parent_child = os.getenv("ENABLE_PARENT_CHILD_CHUNKING", "false").lower() == "true"
                    enable_hierarchical = os.getenv("ENABLE_HIERARCHICAL_CHUNKING", "true").lower() == "true"

                    if use_parent_child:
                        # Thero-style: Small children for search, large parents for generation
                        child_documents, parent_documents = self._create_parent_child_chunks(
                            text_blocks,
                            base_metadata,
                        )
                        documents_to_embed.extend(child_documents)

                        # Store parents in ArangoDB (not in Qdrant metadata!)
                        if parent_documents:
                            await self._store_parent_chunks(
                                parent_documents,
                                virtual_record_id,
                                org_id,
                            )

                        self.logger.info(
                            f"✅ Parent-Child Strategy: {len(child_documents)} children for embedding, "
                            f"{len(parent_documents)} parents stored in ArangoDB"
                        )

                    elif enable_hierarchical:
                        # Standard hierarchical chunking (markdown-aware)
                        text_documents = self._create_hierarchical_chunks(
                            text_blocks,
                            base_metadata,
                            use_hierarchical=True,
                        )
                        documents_to_embed.extend(text_documents)

                        self.logger.info(
                            f"✅ Hierarchical Strategy: {len(text_documents)} documents for embedding"
                        )
                    else:
                        # Fall back to sentence-level chunking
                        text_documents = self._create_sentence_chunks(
                            text_blocks,
                            base_metadata,
                        )
                        documents_to_embed.extend(text_documents)

                        self.logger.info(
                            f"✅ Sentence Strategy: {len(text_documents)} documents for embedding"
                        )

                except Exception as e:
                    raise DocumentProcessingError(
                        "Failed to create text document objects: " + str(e),
                        details={"error": str(e)},
                    )

            # Process image blocks - create image embeddings
            if image_blocks:
                try:
                    images_uris = []
                    for block in image_blocks:
                        # Get image data from metadata
                        image_data = block.data
                        if image_data:
                            image_uri = image_data.get("uri")
                            images_uris.append(image_uri)

                    if images_uris:
                        if is_multimodal_embedding:
                            for block in image_blocks:
                                metadata = {
                                    **base_metadata,
                                    "blockIndex": block.index,
                                    "isBlock": True,
                                    "isBlockGroup": False,
                                }
                                image_data = block.data
                                image_uri = image_data.get("uri")
                                documents_to_embed.append(
                                    {"image_uri": image_uri, "metadata": metadata}
                                )
                        elif is_multimodal_llm:
                            description_results = await self.describe_images(
                                images_uris,llm
                            )
                            for result, block in zip(description_results, image_blocks):
                                if result["success"]:
                                    metadata = {
                                        **base_metadata,
                                        "blockIndex": block.index,
                                        "isBlock": True,
                                        "isBlockGroup": False,
                                    }
                                    description = result["description"]
                                    documents_to_embed.append(
                                        Document(
                                            page_content=description, metadata=metadata
                                        )
                                    )
                        elif mime_type in {MimeTypes.PNG.value, MimeTypes.JPG.value, MimeTypes.JPEG.value, MimeTypes.WEBP.value, MimeTypes.SVG.value, MimeTypes.HEIC.value, MimeTypes.HEIF.value}:
                            try:
                                record = await self.arango_service.get_document(
                                    record_id, CollectionNames.RECORDS.value
                                )
                                if not record:
                                    raise DocumentProcessingError(
                                        "Record not found in database",
                                        doc_id=record_id,
                                    )
                                doc = dict(record)
                                doc.update(
                                    {
                                        "indexingStatus": "ENABLE_MULTIMODAL_MODELS",
                                        "isDirty": True,
                                        "virtualRecordId": virtual_record_id,
                                    }
                                )

                                docs = [doc]

                                success = await self.arango_service.batch_upsert_nodes(
                                    docs, CollectionNames.RECORDS.value
                                )
                                if not success:
                                    raise DocumentProcessingError(
                                        "Failed to update indexing status", doc_id=record_id
                                    )

                                return False

                            except DocumentProcessingError:
                                raise
                            except Exception as e:
                                raise DocumentProcessingError(
                                    "Error updating record status: " + str(e),
                                    doc_id=record_id,
                                    details={"error": str(e)},
                                )
                except Exception as e:
                    raise DocumentProcessingError(
                        "Failed to create image document objects: " + str(e),
                        details={"error": str(e)},
                    )

            # Process table blocks - create table embeddings
            if table_blocks:
                for block in table_blocks:
                    block_type = block.type
                    if block_type.lower() in ["table"]:
                        table_data = block.data
                        if table_data:
                            table_summary = table_data.get("table_summary","")
                            documents_to_embed.append(Document(page_content=table_summary, metadata={
                                **base_metadata,
                                "blockIndex": block.index,
                                "isBlock": False,
                                "isBlockGroup": True,
                            }))
                    elif block_type.lower() in ["table_row"]:
                        table_data = block.data
                        table_row_text = table_data.get("row_natural_language_text")
                        documents_to_embed.append(Document(page_content=table_row_text, metadata={
                            **base_metadata,
                            "blockIndex": block.index,
                            "isBlock": True,
                            "isBlockGroup": False,
                        }))

            if not documents_to_embed:
                self.logger.warning(
                    "⚠️ No documents to embed after filtering by block type"
                )
                return True

            # Debug: Save pre-chunking input (full text before chunking)
            try:
                # Combine all text content from documents
                full_text_parts = []
                for doc in documents_to_embed:
                    if isinstance(doc, Document):
                        full_text_parts.append(doc.page_content)
                    elif isinstance(doc, dict) and "image_uri" in doc:
                        full_text_parts.append(f"[Image: {doc.get('image_uri', 'unknown')}]")

                if full_text_parts:
                    full_text = "\n\n".join(full_text_parts)
                    # Get record name from metadata if available
                    record_name = documents_to_embed[0].metadata.get("recordName", "unknown") if documents_to_embed and isinstance(documents_to_embed[0], Document) else "unknown"
                    debug_path = save_pre_chunking_input(record_name, full_text, record_id)
                    if debug_path:
                        self.logger.info(f"🐛 Debug: Saved pre-chunking input to {debug_path}")
            except Exception as e:
                self.logger.warning(f"⚠️ Failed to save pre-chunking debug output: {str(e)}")

            # Debug: Save post-chunking output (chunks after chunking)
            # Note: In the current implementation, documents_to_embed are already the "chunks"
            # If semantic chunking is applied later, this would be updated
            try:
                # Filter to only Document objects (not image dicts)
                document_chunks = [doc for doc in documents_to_embed if isinstance(doc, Document)]
                if document_chunks:
                    record_name = document_chunks[0].metadata.get("recordName", "unknown") if document_chunks else "unknown"
                    debug_path = save_post_chunking_output(record_name, document_chunks, record_id)
                    if debug_path:
                        self.logger.info(f"🐛 Debug: Saved post-chunking output to {debug_path}")
            except Exception as e:
                self.logger.warning(f"⚠️ Failed to save post-chunking debug output: {str(e)}")

            # Create and store embeddings
            try:
                await self._create_embeddings(documents_to_embed, record_id, virtual_record_id)
            except Exception as e:
                raise EmbeddingError(
                    "Failed to create or store embeddings: " + str(e),
                    details={"error": str(e)},
                )

            return True

        except IndexingError:
            # Re-raise any of our custom exceptions
            raise
        except Exception as e:
            # Catch any unexpected errors
            raise IndexingError(
                f"Unexpected error during indexing: {str(e)}",
                details={"error_type": type(e).__name__},
            )
