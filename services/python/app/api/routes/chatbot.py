import asyncio
import json
import logging
from datetime import datetime
from typing import Any, AsyncGenerator, Callable, Dict, List, Literal, Optional, Tuple

from dependency_injector.wiring import inject
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from jinja2 import Template
from langchain.chat_models.base import BaseChatModel
from langchain_core.messages import (
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
)
from pydantic import BaseModel

from app.api.helpers.deepresearch_helper import (
    DeepResearchHelper,
    DeepResearchQuery,
)
from app.connectors.services.base_arango_service import BaseArangoService
from app.containers.query import QueryAppContainer
from app.exceptions.fastapi_responses import Status
from app.modules.agents.prompts.web_search_template import (
    WebSearchAnswerWithMetadata,
    web_search_prompt,
)
from app.modules.agents.qna.tools import WebSearchTool
from app.modules.qna.prompt_templates import (
    chat_prompt_no_rag,
    qna_prompt,
    qna_prompt_simple,
)
from app.modules.reranker.reranker import RerankerService
from app.modules.retrieval.retrieval_service import RetrievalService
from app.modules.transformers.blob_storage import BlobStorage
from app.modules.web_search.classifier import classify_web_need
from app.utils.aimodels import ModelType
from app.utils.cache_helpers import get_cached_user_info
from app.utils.chat_helpers import get_flattened_results, get_message_content
from app.utils.citations import process_citations
from app.utils.fetch_full_record import create_fetch_full_record_tool
from app.utils.llm import get_llm
from app.utils.query_decompose import QueryDecompositionExpansionService
from app.utils.query_transform import transform_followup_query
from app.utils.streaming import (
    create_sse_event,
    stream_llm_response_with_tools,
)
from libs.core.config import ConfigurationService
from libs.core.constants import AccountType

router = APIRouter()
title_router = APIRouter()

logger = logging.getLogger(__name__)

# Pydantic models
class ChatQuery(BaseModel):
    query: str
    limit: Optional[int] = 50
    previousConversations: List[Dict] = []
    filters: Optional[Dict[str, Any]] = None
    retrievalMode: Optional[str] = "HYBRID"
    quickMode: Optional[bool] = False
    reasoningEnabled: Optional[bool] = False
    useWebSearch: Optional[bool] = False
    mode: Optional[str] = "chat"
    # Clarification response fields
    isClarificationResponse: Optional[bool] = False
    originalQuery: Optional[str] = None
    # Research plan confirmation fields (for medium confidence queries)
    isPlanConfirmation: Optional[bool] = False
    confirmedPlan: Optional[List[str]] = None
    confirmedAssumptions: Optional[List[str]] = None


class WebSearchRequest(BaseModel):
    query: str
    maxResults: Optional[int] = 5
    maxPages: Optional[int] = 2
    includeContent: Optional[bool] = True


class ChatTitleMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatTitleRequest(BaseModel):
    messages: List[ChatTitleMessage]
    max_tokens: Optional[int] = 40


VECTOR_DB_UNAVAILABLE_STATUSES = {
    Status.VECTOR_DB_EMPTY.value,
    Status.VECTOR_DB_NOT_READY.value,
}

KB_FALLBACK_MESSAGE = "No knowledge base content is available yet. Provide the best possible answer from existing knowledge and explain that internal citations are unavailable."
KB_FALLBACK_NOTICE = (
    "Knowledge base notice: No indexed records were available for this request. "
    "Answer using your general expertise and clearly state that citations cannot be provided for this response."
)

TITLE_SYSTEM_PROMPT = (
    "You create very short, clear conversation titles for a workplace AI assistant.\n\n"
    "Goal:\n"
    "- Summarize the main topic of the chat in 3–6 words.\n"
    "- Titles must be in the same language as the user's messages.\n"
    "- The context is a business/workplace environment.\n\n"
    "Rules:\n"
    "- Focus on what the user is trying to achieve.\n"
    "- Do not include personal names or sensitive data; generalize them.\n"
    "- No emojis, no quotes, no trailing punctuation.\n"
    "- Max 30 characters.\n"
    "- If the topic is unclear, use a generic but helpful title.\n\n"
    'Return ONLY a STRING like {"title": "..."}.\n'
)

TITLE_LABELS: Dict[str, Dict[str, str]] = {
    "de": {"placeholder": "Neue Unterhaltung", "fallback": "Allgemeine Fragen"},
    "en": {"placeholder": "New conversation", "fallback": "General questions"},
    "es": {"placeholder": "Nueva conversación", "fallback": "Preguntas generales"},
    "fr": {"placeholder": "Nouvelle conversation", "fallback": "Questions générales"},
    "it": {"placeholder": "Nuova conversazione", "fallback": "Domande generali"},
    "nl": {"placeholder": "Nieuw gesprek", "fallback": "Algemene vragen"},
    "pt": {"placeholder": "Nova conversa", "fallback": "Perguntas gerais"},
}

# NOTE: These localization defaults are reserved for future UI placeholder/fallback handling.
DEFAULT_LANG = "en"


MAX_WEB_CONTENT_CHARS = 4000


def _is_vector_db_unavailable(result: Dict[str, Any]) -> bool:
    return (
        result.get("status_code") == 503
        and result.get("status") in VECTOR_DB_UNAVAILABLE_STATUSES
    )


def _append_no_context_notice(content: Any, notice: str) -> Any:
    """Ensure the model sees a notice when KB context is missing."""
    if isinstance(content, list):
        content.append({"type": "text", "text": notice})
        return content
    if isinstance(content, str):
        return f"{content}\n\n{notice}"
    return content


def _web_results_to_documents(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert web search results into document payloads for downstream processing."""
    documents = []
    for idx, result in enumerate(results):
        raw_content = result.get("content") or result.get("snippet") or ""
        if not raw_content:
            continue

        content = raw_content[:MAX_WEB_CONTENT_CHARS]
        result["content"] = content

        virtual_record_id = f"web-{idx + 1}"
        url = result.get("url")
        title = result.get("title")

        # Provide full metadata required by the Node citation schema
        # so citation persistence (mimeType, recordId, recordName, origin, etc.)
        # succeeds for web search results.
        metadata = {
            "recordId": url,
            "recordName": title or (url or f"Web result {idx + 1}"),
            "recordType": "web",
            "origin": "web",
            "webUrl": url,
            "domain": result.get("domain"),
            # Sensible defaults for required citation metadata fields
            "mimeType": "text/html",
            "extension": "html",
            "recordVersion": 0,
        }

        documents.append(
            {
                "content": content,
                "virtual_record_id": virtual_record_id,
                "block_index": 0,
                "metadata": metadata,
                "citationType": "web|page",
            }
        )
    return documents


def _web_results_to_event_payload(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    payload = []
    for result in results:
        payload.append(
            {
                "id": result.get("id"),
                "title": result.get("title"),
                "url": result.get("url"),
                "snippet": result.get("snippet"),
                "domain": result.get("domain"),
            }
        )
    return payload


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


def _build_event_payload(step: str, message: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "timestamp": _utc_timestamp(),
        "step": step,
    }
    if message:
        payload["message"] = message
    for key, value in extra.items():
        if value is not None:
            payload[key] = value
    return payload


def _contains_url(query_text: Optional[str]) -> bool:
    """
    Lightweight heuristic to detect whether the query likely contains a URL.

    This is intentionally simple to preserve previous behaviour where
    sending a bare URL would always trigger a web search, even if the
    classifier might not flag it as needing external information.
    """
    if not query_text:
        return False
    lowered = query_text.lower()
    return "http://" in lowered or "https://" in lowered or "www." in lowered


async def _should_use_web_search(
    query: ChatQuery,
    logger,
) -> Tuple[bool, str]:
    """
    Decide whether web search should run and return the decision source.

    The routing uses three strategies in order:
    1. Explicit user flag (useWebSearch=true)
    2. URL heuristic (query contains http://, https://, or www.)
    3. HuggingFace zero-shot classifier (ONNX-optimized primary, PyTorch fallback)
       - Primary: ONNX Runtime with INT8 quantization (~60-120ms)
       - Fallback: Standard PyTorch transformer (~250-400ms)
    """
    if getattr(query, "useWebSearch", False):
        return True, "user"

    # Preserve legacy behaviour: if the user sends (or includes) a URL,
    # we always attempt a web search regardless of classifier outcome.
    if _contains_url(getattr(query, "query", None)):
        logger.debug("Web search enabled via URL heuristic based on query content.")
        return True, "url_heuristic"

    try:
        should_search = await classify_web_need(query.query, logger)
        return should_search, "hf_classifier"
    except Exception as e:
        logger.error("HF classifier failed, skipping web search: %s", str(e))
        return False, "classifier_error"


# Dependency injection functions
async def get_retrieval_service(request: Request) -> RetrievalService:
    container: QueryAppContainer = request.app.container
    retrieval_service = await container.retrieval_service()
    return retrieval_service


async def get_arango_service(request: Request) -> BaseArangoService:
    container: QueryAppContainer = request.app.container
    arango_service = await container.arango_service()
    return arango_service


async def get_config_service(request: Request) -> ConfigurationService:
    container: QueryAppContainer = request.app.container
    config_service = container.config_service()
    return config_service


async def get_reranker_service(request: Request) -> RerankerService:
    container: QueryAppContainer = request.app.container
    reranker_service = container.reranker_service()
    return reranker_service


def get_model_config_for_mode(mode: Optional[str]) -> Dict[str, str]:
    """Map a conversation mode to the correct system prompt template."""
    normalized_mode = (mode or "chat").lower()

    if normalized_mode in ("knowledge", "deepresearch"):
        prompt = qna_prompt
        prompt_name = "qna_prompt"
    elif normalized_mode == "simple":
        prompt = qna_prompt_simple
        prompt_name = "qna_prompt_simple"
    else:
        if normalized_mode != "chat":
            logger.warning(
                "Unknown conversation mode '%s'; falling back to chat prompt",
                normalized_mode,
            )
        prompt = chat_prompt_no_rag
        prompt_name = "chat_prompt_no_rag"

    logger.debug(
        "Selected system prompt '%s' for conversation mode '%s'",
        prompt_name,
        normalized_mode,
    )
    return {"system_prompt": prompt}





async def _enrich_with_web_results(
    query_info: ChatQuery,
    config_service: ConfigurationService,
    retrieval_service: RetrievalService,
    final_results: List[Dict[str, Any]],
    virtual_record_id_to_result: Dict[str, Dict[str, Any]],
    logger,
    event_emitter: Optional[Callable[..., str]] = None,
    event_buffer: Optional[List[str]] = None,
) -> Optional[List[Dict[str, Any]]]:
    tool_state: Dict[str, Any] = {
        "logger": logger,
        "retrieval_service": retrieval_service,
        "config_service": config_service,
        "web_search_queries": [],
        "web_search_results": None,
        "web_search_template_context": None,
    }

    def record_event(event_type: str, step: str, message: Optional[str] = None, **extra: Any) -> None:
        if event_emitter and event_buffer is not None:
            event_buffer.append(event_emitter(event_type, step, message, **extra))

    if event_emitter and event_buffer is not None:
        tool_state["event_recorder"] = record_event

    web_search_tool = WebSearchTool(tool_state)
    tool_response_raw = await web_search_tool._arun(
        query=query_info.query,
        max_results=5,
        max_pages=1,
        include_content=True,
    )
    tool_payload = json.loads(tool_response_raw or "{}")
    results = tool_payload.get("results") or []

    documents = _web_results_to_documents(results)
    for doc in documents:
        final_results.append(doc)
        virtual_record_id = doc.get("virtual_record_id")
        virtual_record_id_to_result[virtual_record_id] = {
            "virtual_record_id": virtual_record_id,
            "record_name": doc.get("metadata", {}).get("recordName"),
            "record_type": "web",
            "origin": "web",
            "weburl": doc.get("metadata", {}).get("webUrl"),
            "block_containers": {
                "blocks": [
                    {
                        "type": "web",
                        "data": doc.get("content", ""),
                    }
                ]
            },
        }

    return _web_results_to_event_payload(results)


async def process_chat_query_with_status(
    query_info: ChatQuery,
    request: Request,
    retrieval_service: RetrievalService,
    arango_service: BaseArangoService,
    reranker_service: RerankerService,
    config_service: ConfigurationService,
    logger,
    yield_status=None
) -> Tuple[
    BaseChatModel,
    List[dict],
    List[Any],
    Optional[dict],
    List[Dict[str, Any]],
    List[str],
    Dict[str, Dict[str, Any]],
    BlobStorage,
    bool,
    Optional[List[Dict[str, Any]]],
]:
    """
    Process chat query with optional status updates.
    If yield_status is provided, it should be an async function that accepts (event_type, data).
    """
    # Get LLM based on configuration; use reasoning bucket when requested.
    requested_model_type = (
        ModelType.REASONING.value if query_info.reasoningEnabled else ModelType.LLM.value
    )
    try:
        llm, config = await get_llm(
            config_service,
            model_type=requested_model_type,
        )
    except ValueError as err:
        if requested_model_type == ModelType.REASONING.value:
            logger.warning(
                "Reasoning mode requested but no reasoning model is configured: %s. Falling back to default LLM.",
                err,
            )
            llm, config = await get_llm(config_service)
        else:
            raise
    is_multimodal_llm = config.get("isMultimodal")
    slm_llm: Optional[BaseChatModel] = None
    try:
        slm_llm, _ = await get_llm(
            config_service,
            model_type=ModelType.SLM.value,
        )
    except Exception as slm_err:
        logger.debug("SLM model unavailable for routing tasks: %s", slm_err)

    if llm is None:
        raise ValueError("Failed to initialize LLM service. LLM configuration is missing.")

    logger.info(f"LLM provider: {config.get('provider', 'unknown').lower()}")
    if config.get("provider").lower() == "ollama":
        query_info.mode = "simple"

    conversation_mode = (query_info.mode or "chat").lower()
    response_mode = query_info.retrievalMode or "HYBRID"
    rag_enabled = conversation_mode in ["knowledge", "deepresearch"]

    # Handle conversation history and query transformation
    if len(query_info.previousConversations) > 0:
        if yield_status:
            await yield_status(
                "status",
                _build_event_payload(
                    "transforming",
                    "Understanding conversation context...",
                    status="transforming",
                    previousConversations=len(query_info.previousConversations)
                )
            )

        # Transform followup query using litellm (no LangChain overhead)
        formatted_history = "\n".join(
            f"{'User' if conv.get('role') == 'user_query' else 'Assistant'}: {conv.get('content')}"
            for conv in query_info.previousConversations
        )
        followup_query = await transform_followup_query(
            query=query_info.query,
            previous_conversations=formatted_history,
            config_service=config_service,
            model_type="slm",  # Use SLM for faster transformation
        )
        query_info.query = followup_query

    org_id = request.state.user.get('orgId')
    user_id = request.state.user.get('userId')
    blob_store = BlobStorage(logger=logger, config_service=config_service, arango_service=arango_service)

    # --- Define Parallel Pipelines ---

    async def run_retrieval_pipeline():
        local_final_results = []
        local_virtual_record_id_to_result = {}
        local_all_queries = [query_info.query]
        local_vector_db_unavailable = False

        if not rag_enabled:
            return local_final_results, local_virtual_record_id_to_result, local_all_queries, local_vector_db_unavailable

        # Query decomposition
        decomposed_queries = []
        if not query_info.quickMode:
            if yield_status:
                await yield_status(
                    "status",
                    _build_event_payload(
                        "analyzing_query",
                        "Analyzing your question...",
                        status="analyzing_query"
                    )
                )
            decomposition_service = QueryDecompositionExpansionService(llm, logger=logger)
            decomposition_result = await decomposition_service.transform_query(query_info.query)
            decomposed_queries = decomposition_result["queries"]

        local_all_queries = [query_info.query] if not decomposed_queries else [query.get("query") for query in decomposed_queries]

        if yield_status:
            await yield_status(
                "status",
                _build_event_payload(
                    "searching_kb",
                    "Searching knowledge base...",
                    status="searching_kb"
                )
            )
            await yield_status(
                "rag_search",
                _build_event_payload(
                    "rag_search",
                    "Preparing knowledge base search...",
                    queries=local_all_queries,
                    filters=query_info.filters,
                    limit=query_info.limit
                )
            )

        result = await retrieval_service.search_with_filters(
            queries=local_all_queries,
            org_id=org_id,
            user_id=user_id,
            limit=query_info.limit,
            filter_groups=query_info.filters,
        )

        # Process search results
        search_results = result.get("searchResults", [])
        status_code = result.get("status_code", 500)
        local_vector_db_unavailable = _is_vector_db_unavailable(result)

        if local_vector_db_unavailable:
            fallback_message = result.get("message", KB_FALLBACK_MESSAGE)
            logger.warning("Vector DB unavailable. Continuing without KB context: %s", fallback_message)
            if yield_status:
                await yield_status(
                    "status",
                    _build_event_payload(
                        "knowledge_base_unavailable",
                        fallback_message,
                        status="knowledge_base_unavailable"
                    )
                )
            search_results = []
        elif status_code in [202, 500, 503]:
            raise HTTPException(status_code=status_code, detail=result)

        if yield_status:
            await yield_status(
                "status",
                _build_event_payload(
                    "processing_results",
                    "Processing search results...",
                    status="processing_results"
                )
            )

        flattened_results = await get_flattened_results(
            search_results, blob_store, org_id, is_multimodal_llm, local_virtual_record_id_to_result
        )

        # Re-rank results
        if len(flattened_results) > 1 and not query_info.quickMode and getattr(query_info, "chatMode", None) != "quick":
            if yield_status:
                await yield_status(
                    "status",
                    _build_event_payload(
                        "ranking_results",
                        "Ranking relevant information...",
                        status="ranking_results"
                    )
                )
            local_final_results = await reranker_service.rerank(
                query=query_info.query,
                documents=flattened_results,
                top_k=query_info.limit,
            )
        else:
            local_final_results = flattened_results

        local_final_results = sorted(local_final_results, key=lambda x: (x['virtual_record_id'], x['block_index']))

        if yield_status:
            kb_sources = {doc.get("virtual_record_id") for doc in local_final_results if doc.get("virtual_record_id")}
            sample_titles: List[str] = []
            for doc in local_final_results:
                metadata = doc.get("metadata") or {}
                candidate = metadata.get("recordName") or metadata.get("recordId")
                if candidate:
                    sample_titles.append(candidate)
                if len(sample_titles) == 3:
                    break

            await yield_status(
                "rag_results",
                _build_event_payload(
                    "rag_results",
                    "Knowledge base results ready.",
                    resultsCount=len(local_final_results),
                    sourcesCount=len(kb_sources),
                    sampleTitles=sample_titles
                )
            )

        return local_final_results, local_virtual_record_id_to_result, local_all_queries, local_vector_db_unavailable

    async def run_web_search_pipeline():
        local_web_sources_payload = None
        local_web_results = []
        local_web_virtual_records = {}

        # Decide web search behaviour based on conversation mode.
        # - For knowledge/deepresearch modes, we do NOT auto-classify or use URL
        #   heuristics. Web search only runs when explicitly requested via
        #   `useWebSearch=True`.
        # - For all other modes (e.g. chat), we keep the existing behaviour:
        #   explicit flag, URL heuristic, then HF classifier.
        if conversation_mode in ["knowledge", "deepresearch"]:
            if getattr(query_info, "useWebSearch", False):
                should_run_web_search = True
                web_search_reason_source = "user"
            else:
                should_run_web_search = False
                web_search_reason_source = "mode_blocked"
        else:
            should_run_web_search, web_search_reason_source = await _should_use_web_search(
                query_info,
                logger,
            )

        if web_search_reason_source == "user":
            web_search_reason = "Web search explicitly requested for this query."
        elif web_search_reason_source == "url_heuristic":
            web_search_reason = "Web search enabled via URL heuristic in query."
        elif web_search_reason_source == "classifier_error":
            web_search_reason = "Web search classifier error; skipping automatic search."
        elif web_search_reason_source == "mode_blocked":
            web_search_reason = (
                "Web search is disabled for knowledge and deepresearch modes "
                "unless explicitly enabled via useWebSearch."
            )
        elif should_run_web_search:
            web_search_reason = "HF classifier recommended web search."
        else:
            web_search_reason = "HF classifier did not require web search."

        logger.info(
            "Web search decision: %s (source=%s, reason=%s)",
            "enabled" if should_run_web_search else "skipped",
            web_search_reason_source,
            web_search_reason,
        )
        intent_message = web_search_reason or (
            "Web search "
            + ("enabled for this query." if should_run_web_search else "not required for this query.")
        )
        if yield_status:
            await yield_status(
                "status",
                _build_event_payload(
                    "analyzing_intent",
                    intent_message,
                    status="analyzing_intent",
                    reason=web_search_reason,
                    reasonSource=web_search_reason_source
                )
            )

        if should_run_web_search:
            try:
                if yield_status:
                    await yield_status(
                        "web_search",
                        _build_event_payload(
                            "web_search",
                            f"Web search in progress for \"{query_info.query}\"",
                            query=query_info.query,
                            reason=web_search_reason,
                            source=web_search_reason_source
                        )
                    )

                # Adapter to capture events from _enrich_with_web_results
                web_search_events = []
                def local_emit(event_type, step, message=None, **extra):
                    payload = _build_event_payload(step, message, **extra)
                    return {"type": event_type, "data": payload}

                # Use separate containers for web search results to avoid race conditions
                local_web_results = []
                local_web_virtual_records = {}

                local_web_sources_payload = await _enrich_with_web_results(
                    query_info,
                    config_service,
                    retrieval_service,
                    local_web_results,
                    local_web_virtual_records,
                    logger,
                    event_emitter=local_emit if yield_status else None,
                    event_buffer=web_search_events
                )

                if yield_status:
                    for evt in web_search_events:
                        await yield_status(evt["type"], evt["data"])

                    if local_web_sources_payload:
                        await yield_status(
                            "web_results",
                            _build_event_payload(
                                "web_results",
                                "Web search results retrieved.",
                                sources=local_web_sources_payload,
                                totalResults=len(local_web_sources_payload)
                            )
                        )

            except Exception as exc:
                logger.error("Web search enrichment failed: %s", exc)
                if yield_status:
                    await yield_status(
                        "status",
                        _build_event_payload(
                            "web_search_error",
                            "Web search enrichment failed",
                            status="web_search_error",
                            error=str(exc)
                        )
                    )

        return local_web_results, local_web_virtual_records, local_web_sources_payload

    # --- Execute Parallel Pipelines ---

    retrieval_task = asyncio.create_task(run_retrieval_pipeline())
    web_search_task = asyncio.create_task(run_web_search_pipeline())

    results = await asyncio.gather(retrieval_task, web_search_task)

    (final_results, virtual_record_id_to_result, all_queries, vector_db_unavailable) = results[0]
    (web_results, web_virtual_records, web_sources_payload) = results[1]

    # Merge results
    if web_results:
        final_results.extend(web_results)
    if web_virtual_records:
        virtual_record_id_to_result.update(web_virtual_records)

    # Prepare user context
    raw_send_user_info = request.query_params.get('sendUserInfo')
    if raw_send_user_info is None:
        send_user_info = True
    else:
        send_user_info = str(raw_send_user_info).strip().lower() in {"1", "true", "yes", "on"}
    user_data = ""

    if send_user_info:
        # Use cached user/org info for better performance (saves 0.5-1s per request)
        user_info, org_info = await get_cached_user_info(arango_service, user_id, org_id)

        if (org_info is not None and (
            org_info.get("accountType") == AccountType.ENTERPRISE.value
            or org_info.get("accountType") == AccountType.BUSINESS.value
        )):
            user_data = (
                "I am the user of the organization. "
                f"User's full name is {user_info.get('fullName', 'a user')} "
                f"User's designation is {user_info.get('designation', 'unknown')} "
                f"and part of the organization {org_info.get('name', 'the organization')}. "
            )
        else:
            user_data = (
                "I am the user. "
                f"User's full name is {user_info.get('fullName', 'a user')} "
                f"User's designation is {user_info.get('designation', 'unknown')} "
            )

    # Prepare messages
    mode_config = get_model_config_for_mode(conversation_mode)
    system_prompt = mode_config['system_prompt']
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history
    for conversation in query_info.previousConversations:
        if conversation.get("role") == "user_query":
            messages.append({"role": "user", "content": conversation.get("content")})
        elif conversation.get("role") == "bot_response":
            messages.append({"role": "assistant", "content": conversation.get("content")})

    # Always add the current query with retrieved context as the final user message
    content = get_message_content(final_results, virtual_record_id_to_result, user_data, query_info.query, logger, response_mode)
    if vector_db_unavailable:
        content = _append_no_context_notice(content, KB_FALLBACK_NOTICE)
    messages.append({"role": "user", "content": content})


    # Prepare tools
    tools = []
    tool_runtime_kwargs = None
    if virtual_record_id_to_result:
        fetch_tool = create_fetch_full_record_tool(virtual_record_id_to_result)
        tools = [fetch_tool]
        tool_runtime_kwargs = {
            "blob_store": blob_store,
            "arango_service": arango_service,
            "org_id": org_id,
        }

    # When web results exist and no KB context was retrieved, sort to keep deterministic ordering
    if final_results:
        final_results = sorted(final_results, key=lambda x: (x.get("virtual_record_id"), x.get("block_index", 0)))

    return llm, messages, tools, tool_runtime_kwargs, final_results, all_queries, virtual_record_id_to_result, blob_store, is_multimodal_llm, web_sources_payload


async def process_chat_query(
    query_info: ChatQuery,
    request: Request,
    retrieval_service: RetrievalService,
    arango_service: BaseArangoService,
    reranker_service: RerankerService,
    config_service: ConfigurationService,
    logger
) -> Tuple[
    BaseChatModel,
    List[dict],
    List[Any],
    Optional[dict],
    List[Dict[str, Any]],
    List[str],
    Dict[str, Dict[str, Any]],
    BlobStorage,
    bool,
    Optional[List[Dict[str, Any]]],
]:
    """Wrapper for non-streaming endpoint (without status updates)."""
    llm, messages, tools, tool_runtime_kwargs, final_results, all_queries, virtual_record_id_to_result, blob_store, is_multimodal_llm, web_sources_payload = await process_chat_query_with_status(
        query_info, request, retrieval_service, arango_service,
        reranker_service, config_service, logger, yield_status=None
    )
    return llm, messages, tools, tool_runtime_kwargs, final_results, all_queries, virtual_record_id_to_result, blob_store, is_multimodal_llm, web_sources_payload


def _ensure_langchain_messages(messages: List[Any]) -> List[BaseMessage]:
    """Ensure we always interact with LangChain message objects."""
    if not messages:
        return []

    if all(isinstance(msg, BaseMessage) for msg in messages):
        return list(messages)

    converted: List[BaseMessage] = []
    for msg in messages:
        if isinstance(msg, BaseMessage):
            converted.append(msg)
            continue

        role = (msg or {}).get("role")
        content = (msg or {}).get("content")
        if role == "system":
            converted.append(SystemMessage(content=content))
        elif role == "assistant":
            converted.append(AIMessage(content=content))
        else:
            converted.append(HumanMessage(content=content))
    return converted


async def resolve_tools_then_answer(llm, messages, tools, tool_runtime_kwargs, max_hops=4) -> AIMessage:
    """Handle tool calls for non-streaming responses with reflection for invalid tool calls"""

    llm_with_tools = llm.bind_tools(tools)
    lc_messages = _ensure_langchain_messages(messages)

    # Initial call with provider-level error handling
    try:
        ai: AIMessage = await llm_with_tools.ainvoke(lc_messages)
    except Exception as e:
        error_str = str(e).lower()
        # Check if this is a tool-related error from the provider
        if any(keyword in error_str for keyword in ['tool_use_failed', 'tool use failed', 'failed to call a function', 'invalid tool', 'function call failed']):
            valid_tool_names = [t.name for t in tools]
            reflection_content = (
                f"Error: The AI provider rejected the function call. This usually means:\n"
                f"1. Invalid arguments were provided to the tool\n"
                f"2. A non-existent tool was called\n"
                f"3. The function call format was incorrect\n\n"
                f"Available tools: {', '.join(valid_tool_names)}\n\n"
                f"Please provide your final answer directly as a JSON object with this structure:\n"
                f'{{"answer": "your answer here", "reason": "reasoning", "confidence": "High/Medium/Low", '
                f'"answerMatchType": "Derived From Blocks/Exact Match/etc", "blockNumbers": [list of block numbers]}}.\n\n'
                f"Do NOT attempt to call any tools. Provide your answer based on the blocks already provided in the context."
            )
            lc_messages.append(HumanMessage(content=reflection_content))
            # Retry without tools binding
            ai: AIMessage = await llm.ainvoke(lc_messages)
            return ai
        else:
            raise

    hops = 0
    while isinstance(ai, AIMessage) and getattr(ai, "tool_calls", None) and hops < max_hops:
        tool_msgs = []
        valid_tool_names = [t.name for t in tools]

        for call in ai.tool_calls:
            name = call["name"]
            args = call.get("args", {}) or {}
            call_id = call.get("id")

            tool = next((t for t in tools if t.name == name), None)
            if tool is None:
                # Use reflection to guide the LLM when it makes invalid tool calls
                reflection_message = (
                    f"Error: Tool '{name}' is not a valid tool. "
                    f"Available tools are: {', '.join(valid_tool_names)}. "
                    "Please provide your final answer directly as a JSON object with the following structure: "
                    '{"answer": "your answer here", "reason": "reasoning", "confidence": "High/Medium/Low", '
                    '"answerMatchType": "Derived From Blocks/Exact Match/etc", "blockNumbers": [list of block numbers]}. '
                    "Do NOT wrap your response in any tool call."
                )
                tool_msgs.append(
                    ToolMessage(
                        content=reflection_message,
                        tool_call_id=call_id,
                    )
                )
                continue

            try:
                tool_result = await tool.arun(args, **tool_runtime_kwargs)
            except Exception as e:
                tool_result = json.dumps({"ok": False, "error": str(e)})

            tool_msgs.append(ToolMessage(content=tool_result, tool_call_id=call_id))

        # feed back tool results
        lc_messages.append(ai)
        lc_messages.extend(tool_msgs)

        # ask model again (now with tool outputs) with error handling
        try:
            ai = await llm_with_tools.ainvoke(lc_messages)
        except Exception as e:
            error_str = str(e).lower()
            if any(keyword in error_str for keyword in ['tool_use_failed', 'tool use failed', 'failed to call a function', 'invalid tool', 'function call failed']):
                reflection_content = (
                    "Error: The AI provider rejected the function call. "
                    "Please provide your final answer directly as a JSON object without using any tools. "
                    "Use only the information from the blocks already provided in the context."
                )
                lc_messages.append(HumanMessage(content=reflection_content))
                # Retry without tools binding
                ai = await llm.ainvoke(lc_messages)
                return ai
            else:
                raise
        hops += 1

    return ai



@router.post("/chat/stream")
@inject
async def askAIStream(
    request: Request,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    arango_service: BaseArangoService = Depends(get_arango_service),
    reranker_service: RerankerService = Depends(get_reranker_service),
    config_service: ConfigurationService = Depends(get_config_service),
) -> StreamingResponse:
    """Perform semantic search across documents with streaming events and tool support"""
    raw_payload = await request.json()
    logger.debug("Stream endpoint called with payload: %s", raw_payload)

    query_info = ChatQuery(**raw_payload)
    logger.debug("Parsed ChatQuery payload: %s", query_info)

    async def generate_stream() -> AsyncGenerator[str, None]:
        logger_local = logger
        try:
            container = request.app.container
            logger_local = container.logger()
            status_queue: asyncio.Queue[str] = asyncio.Queue()

            def emit(event_type: str, step: str, message: Optional[str] = None, **extra: Any) -> str:
                sse_event = create_sse_event(event_type, _build_event_payload(step, message, **extra))
                return sse_event

            # Send initial status immediately upon connection
            initial_event = emit("status", "started", "Processing your query...", status="started")
            yield initial_event

            conversation_mode = (query_info.mode or "chat").lower()
            logger_local.debug(f"Conversation mode: {conversation_mode}")

            if conversation_mode == "deepresearch":
                logger_local.debug("Starting DeepResearch streaming mode")
                dr_helper = DeepResearchHelper(config_service, logger_local)
                dr_query = DeepResearchQuery(
                    query=query_info.query,
                    isClarificationResponse=query_info.isClarificationResponse,
                    originalQuery=query_info.originalQuery,
                    isPlanConfirmation=query_info.isPlanConfirmation,
                    confirmedPlan=query_info.confirmedPlan,
                    confirmedAssumptions=query_info.confirmedAssumptions,
                )
                async for dr_event in dr_helper.stream_research(dr_query, emit):
                    yield dr_event
                logger_local.debug("DeepResearch streaming completed")
                return

            async def status_callback(event_type, data):
                sse_event = create_sse_event(event_type, data)
                await status_queue.put(sse_event)
            pipeline_task = asyncio.create_task(
                process_chat_query_with_status(
                    query_info,
                    request,
                    retrieval_service,
                    arango_service,
                    reranker_service,
                    config_service,
                    logger_local,
                    yield_status=status_callback,
                )
            )

            event_count = 0
            while True:
                if pipeline_task.done() and status_queue.empty():
                    break
                try:
                    status_event = await asyncio.wait_for(status_queue.get(), timeout=0.1)
                    yield status_event
                    event_count += 1
                except asyncio.TimeoutError:
                    continue
            pipeline_result = await pipeline_task

            (
                llm,
                messages,
                tools,
                tool_runtime_kwargs,
                final_results,
                all_queries,
                virtual_record_id_to_result,
                blob_store,
                is_multimodal_llm,
                web_sources_payload
            ) = pipeline_result

            # Emit meta event
            knowledge_used = bool(final_results) or bool(virtual_record_id_to_result)
            retrieval_strategy = (
                "none"
                if not knowledge_used
                else ("web" if query_info.mode not in ["knowledge", "deepresearch"] and final_results else str(query_info.retrievalMode or "HYBRID").lower())
            )
            sources_count = len({r.get("virtual_record_id") for r in final_results}) if final_results else 0
            steps_summary: List[str] = []
            if final_results:
                steps_summary.append("rag")
            if web_sources_payload:
                steps_summary.append("web_search")
            if tools:
                steps_summary.append("tools")
            if not steps_summary:
                steps_summary.append("reasoning")

            meta_event = emit(
                "meta",
                "meta",
                "Retrieval summary",
                knowledgeUsed=knowledge_used,
                retrievalStrategy=retrieval_strategy,
                sourcesCount=sources_count,
                steps=steps_summary,
            )
            yield meta_event

            # Stream response

            async for stream_event in stream_llm_response_with_tools(
                llm,
                messages,
                final_results,
                all_queries,
                retrieval_service,
                request.state.user.get('userId'),
                request.state.user.get('orgId'),
                virtual_record_id_to_result,
                blob_store,
                is_multimodal_llm,
                tools=tools,
                tool_runtime_kwargs=tool_runtime_kwargs,
                target_words_per_chunk=1,
                mode="HYBRID",
                reasoning_enabled=bool(query_info.reasoningEnabled),
            ):
                event_type = stream_event.get("event")
                data = stream_event.get("data", {})

                sse_event = create_sse_event(event_type, data)
                yield sse_event

        except HTTPException as e:
            result = e.detail
            error_event = emit(
                "error",
                "http_error",
                result.get("message", "No results found"),
                status=result.get("status", "error"),
                details=result,
            )
            yield error_event
        except Exception as e:
            logger_local.error("Error in streaming AI: %s", str(e), exc_info=True)
            fatal_error_event = emit("error", "fatal_error", "Fatal streaming error", error=str(e))
            yield fatal_error_event

    streaming_response = StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control"
        }
    )
    return streaming_response


@router.post("/chat")
@inject
async def askAI(
    request: Request,
    query_info: ChatQuery,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    arango_service: BaseArangoService = Depends(get_arango_service),
    reranker_service: RerankerService = Depends(get_reranker_service),
    config_service: ConfigurationService = Depends(get_config_service),
) -> JSONResponse:
    """Perform semantic search across documents"""
    try:
        container = request.app.container
        logger = container.logger()

        conversation_mode = (query_info.mode or "chat").lower()
        logger.debug(f"Conversation mode: {conversation_mode}")

        if conversation_mode == "deepresearch":
            logger.debug("Starting DeepResearch non-streaming mode")
            dr_helper = DeepResearchHelper(config_service, logger)
            dr_payload = await dr_helper.run_research(query_info.query)
            logger.debug("DeepResearch completed, returning response")
            return JSONResponse(dr_payload)

        # Process query using shared logic
        llm, messages, tools, tool_runtime_kwargs, final_results, all_queries, virtual_record_id_to_result, blob_store, is_multimodal_llm, web_sources_payload = await process_chat_query(
            query_info, request, retrieval_service, arango_service, reranker_service, config_service, logger
        )

        # Make async LLM call with tools
        final_ai_msg = await resolve_tools_then_answer(llm, messages, tools, tool_runtime_kwargs, max_hops=4)

        logger.debug("LLM result (non-stream) content: %s", getattr(final_ai_msg, "content", "NO CONTENT"))
        if hasattr(final_ai_msg, 'tool_calls') and final_ai_msg.tool_calls:
            logger.debug("LLM result tool calls: %s", final_ai_msg.tool_calls)

        # Guard: ensure we have content
        if not getattr(final_ai_msg, "content", None):
            raise HTTPException(status_code=500, detail="Model returned no final content after tool calls")

        return process_citations(final_ai_msg, final_results, records=[], from_agent=False)

    except HTTPException as he:
        # Re-raise HTTP exceptions with their original status codes
        raise he
    except Exception as e:
        logger.error(f"Error in askAI: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


def _build_web_prompt_sources(search_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    sources = []
    fetched_at = search_result.get("fetched_at")
    for entry in search_result.get("results", []):
        raw_content = entry.get("content") or entry.get("snippet") or ""
        content = raw_content[:MAX_WEB_CONTENT_CHARS] if raw_content else ""
        # Keep the trimmed content in the entry so downstream usage (if any)
        # does not unintentionally reintroduce huge payloads.
        if raw_content and len(raw_content) > len(content):
            entry["content"] = content

        sources.append(
            {
                "url": entry.get("url"),
                "title": entry.get("title"),
                "content": content,
                "fetch_date": fetched_at,
                "domain": entry.get("domain"),
            }
        )
    return sources


def _parse_web_answer(raw_text: Any) -> WebSearchAnswerWithMetadata:
    if isinstance(raw_text, list):
        raw_text = "".join(str(part) for part in raw_text if isinstance(part, str))
    if not isinstance(raw_text, str):
        raw_text = str(raw_text)
    try:
        return WebSearchAnswerWithMetadata.model_validate_json(raw_text)
    except Exception:
        try:
            return WebSearchAnswerWithMetadata.model_validate_json(json.dumps({"answer": raw_text}))
        except Exception:
            return WebSearchAnswerWithMetadata(
                answer=raw_text,
                reason="Unable to parse structured response; returning raw text.",
                confidence="Low",
                answerMatchType="Synthesized",
                sourceIndexes=[],
                sources=[],
            )


@router.post("/web-search")
@inject
async def run_web_search(
    request: Request,
    payload: WebSearchRequest,
    config_service: ConfigurationService = Depends(get_config_service),
):
    container = request.app.container
    logger = container.logger()

    tool_state: Dict[str, Any] = {
        "logger": logger,
        "config_service": config_service,
        "web_search_queries": [],
        "web_search_results": None,
        "web_search_template_context": None,
    }
    web_search_tool = WebSearchTool(tool_state)
    tool_response_raw = await web_search_tool._arun(
        query=payload.query,
        max_results=payload.maxResults or 5,
        max_pages=payload.maxPages or 2,
        include_content=payload.includeContent,
    )
    search_result = json.loads(tool_response_raw or "{}")

    if not search_result.get("results"):
        raise HTTPException(
            status_code=404,
            detail="No web sources were found for this query.",
        )

    prompt = Template(web_search_prompt).render(
        query=payload.query,
        search_context="",
        web_sources=_build_web_prompt_sources(search_result),
    )

    llm, _llm_config = await get_llm(config_service)
    llm_response = await llm.ainvoke([HumanMessage(content=prompt)])
    structured_answer = _parse_web_answer(getattr(llm_response, "content", llm_response))

    return JSONResponse(
        {
            "answer": structured_answer.answer,
            "reason": structured_answer.reason,
            "confidence": structured_answer.confidence,
            "answerMatchType": structured_answer.answerMatchType,
            "sources": structured_answer.sources,
            "searchResults": search_result.get("results", []),
            "fetchedAt": search_result.get("fetched_at"),
        }
    )


@title_router.post("/chat/title")
@inject
async def generate_chat_title(
    request: Request,
    payload: ChatTitleRequest,
    config_service: ConfigurationService = Depends(get_config_service),
) -> JSONResponse:
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages are required")

    container = request.app.container
    logger = container.logger()
    try:
        # Prefer SLM for title generation as it is faster and sufficient
        llm, _config = await get_llm(config_service, model_type=ModelType.SLM.value)
    except Exception as exc:
        logger.warning(f"Failed to initialize SLM for titles: {exc}. Falling back to default LLM.")
        try:
            llm, _config = await get_llm(config_service)
        except Exception as exc_llm:
            logger.error(f"Failed to initialize LLM for titles: {exc_llm}", exc_info=True)
            raise HTTPException(status_code=500, detail="Unable to initialize title generator")

    llm_runner = llm.bind(max_tokens=min(payload.max_tokens or 40, 60))

    prompt_messages: List[Any] = [SystemMessage(content=TITLE_SYSTEM_PROMPT)]
    for msg in payload.messages:
        content = (msg.content or "").strip()
        if not content:
            continue
        if msg.role != "user":
            continue
        prompt_messages.append(HumanMessage(content=content))

    if len(prompt_messages) == 1:
        raise HTTPException(status_code=400, detail="At least one conversation message is required")

    try:
        response = await llm_runner.ainvoke(prompt_messages)
    except Exception as exc:
        logger.error(f"Title generation failed: {exc}", exc_info=True)
        raise HTTPException(status_code=502, detail="Failed to generate title")

    raw_text = getattr(response, "content", response)
    title_value: Optional[str] = None  # Initialisiere mit None
    try:
        parsed = json.loads(raw_text)
        title_value = parsed.get("title")
        if title_value is None:  # Fallback wenn title-Key fehlt
            title_value = raw_text
    except (json.JSONDecodeError, AttributeError):
        title_value = raw_text

    return JSONResponse({"title": title_value})
