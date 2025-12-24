"""
Search API Routes - High-performance semantic search.

Uses litellm for query transformation (no LangChain overhead).
"""

from typing import Any, Dict, List, Optional

from dependency_injector.wiring import inject
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.connectors.services.base_arango_service import BaseArangoService
from app.containers.query import QueryAppContainer
from app.modules.retrieval.retrieval_service import RetrievalService
from app.utils.query_transform import transform_query
from libs.core.config import ConfigurationService

router = APIRouter()


# Pydantic models for request validation
class SearchQuery(BaseModel):
    query: str
    limit: Optional[int] = 5
    filters: Optional[Dict[str, Any]] = {}


class SimilarDocumentQuery(BaseModel):
    document_id: str
    limit: Optional[int] = 5
    filters: Optional[Dict[str, Any]] = None


class SearchRequest(BaseModel):
    query: str
    topK: int = 20
    filtersV1: List[Dict[str, List[str]]]


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


@router.post("/search")
@inject
async def search(
    request: Request,
    body: SearchQuery,
    retrieval_service: RetrievalService = Depends(get_retrieval_service),
    arango_service: BaseArangoService = Depends(get_arango_service),
    config_service: ConfigurationService = Depends(get_config_service),
) -> JSONResponse:
    """
    Perform semantic search across documents.

    Uses litellm for query transformation (rewrite + expansion) instead of
    LangChain chains, reducing overhead by ~2-5x for simple transformations.
    """
    try:
        container = request.app.container
        logger = container.logger()

        # Extract KB IDs from filters if present
        kb_ids = body.filters.get('kb') if body.filters else None
        updated_filters = body.filters
        accessible_kbs = []
        inaccessible_kbs = []

        # Validate KB IDs if provided
        if kb_ids:
            logger.info(f"Search request with KB filtering: {kb_ids}")

            # Validate KB access
            kb_validation = await arango_service.validate_user_kb_access(
                user_id=request.state.user.get("userId"),
                org_id=request.state.user.get("orgId"),
                kb_ids=kb_ids
            )

            accessible_kbs = kb_validation.get("accessible", [])
            inaccessible_kbs = kb_validation.get("inaccessible", [])

            if not accessible_kbs:
                logger.warning(f"User has no access to requested KBs: {kb_ids}")
                return JSONResponse(
                    status_code=403,
                    content={
                        "searchResults": [],
                        "records": [],
                        "status": "ACCESS_DENIED",
                        "status_code": 403,
                        "message": "You don't have access to any of the specified knowledge bases.",
                        "inaccessible_kbs": inaccessible_kbs
                    }
                )

            if inaccessible_kbs:
                logger.warning(f"Some KBs are inaccessible: {inaccessible_kbs}")

            # Update filters with only accessible KBs
            updated_filters = body.filters.copy() if body.filters else {}
            updated_filters['kb'] = accessible_kbs
            logger.info(f"Using accessible KBs for search: {accessible_kbs}")

        # Query transformation using litellm (no LangChain overhead)
        # Uses SLM model type by default for faster transformations
        try:
            rewritten_query, expanded_queries = await transform_query(
                query=body.query,
                config_service=config_service,
                model_type="slm",  # Use SLM for faster query transformation
            )
            logger.debug(f"Rewritten query: {rewritten_query}")
            logger.debug(f"Expanded queries: {expanded_queries}")
        except Exception as e:
            # Fallback: use original query if transformation fails
            logger.warning(f"Query transformation failed, using original: {e}")
            rewritten_query = body.query
            expanded_queries = []

        # Build final query list (deduplicated)
        queries = [rewritten_query.strip()] if rewritten_query.strip() else []
        queries.extend([q for q in expanded_queries if q not in queries])

        # Execute search
        results = await retrieval_service.search_with_filters(
            queries=queries,
            org_id=request.state.user.get("orgId"),
            user_id=request.state.user.get("userId"),
            limit=body.limit,
            filter_groups=updated_filters,
            arango_service=arango_service,
            knowledge_search=True,
        )

        custom_status_code = results.get("status_code", 500)
        logger.info(f"Search completed with status code: {custom_status_code}")

        # Add KB filtering info to response if KB filtering was applied
        if kb_ids:
            results["kb_filtering"] = {
                "requested_kbs": kb_ids,
                "accessible_kbs": accessible_kbs,
                "inaccessible_kbs": inaccessible_kbs,
                "total_requested": len(kb_ids),
                "total_accessible": len(accessible_kbs)
            }

        return JSONResponse(status_code=custom_status_code, content=results)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy"}
