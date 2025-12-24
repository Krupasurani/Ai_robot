"""
DeepResearch Service Entrypoint.

FastAPI application for running DeepResearch agent queries.
Updated for SOTA with SLM-based content extraction and planning phase.

Supports two execution modes:
1. Direct mode: Synchronous execution within the API process (for simple queries)
2. Distributed mode: Celery-based parallel execution with Redis streaming (for complex queries)
"""

import json
import os
import signal
import sys
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, AsyncGenerator, Dict, List, Optional

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

# Load environment variables from the Python service .env before importing local modules
ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
ENV_LOADED = load_dotenv(ENV_PATH)

from app.services.deepresearch.agent import DeepResearchAgent
from app.services.deepresearch.stream import RedisStreamListener, format_sse_event
from app.services.sandbox.service import SandboxService, set_sandbox_service
from libs.core.config import ConfigurationService
from libs.core.config.providers.etcd import Etcd3EncryptedKeyValueStore
from libs.core.constants import HttpStatusCode
from libs.core.logging import create_logger
from libs.core.utils import get_epoch_timestamp_in_ms

logger = create_logger("research_main")
if ENV_LOADED:
    logger.debug(f"Loaded environment variables from {ENV_PATH}")
else:
    logger.debug(f"No .env found at {ENV_PATH}, relying on existing environment variables")


# Signal handlers for graceful shutdown
def handle_sigterm(signum, frame) -> None:
    logger.info(f"Received signal {signum}, shutting down gracefully")
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)


# Request/Response models
class ResearchRequest(BaseModel):
    """Request model for research queries."""
    question: str = Field(..., description="The research question to investigate")
    max_rounds: Optional[int] = Field(None, description="Maximum number of LLM call rounds")
    max_time_minutes: Optional[int] = Field(150, description="Maximum execution time in minutes")
    enable_planning: bool = Field(True, description="Whether to generate a research plan before starting")
    distributed: bool = Field(False, description="Use distributed execution with parallel subtasks")
    max_parallel_subtasks: int = Field(5, description="Maximum parallel subtasks in distributed mode")
    # Pre-defined research plan (from SLM planning phase, optionally refined by user)
    research_plan: Optional[List[str]] = Field(None, description="Pre-defined research plan steps to use instead of generating a new one")


class ResearchResponse(BaseModel):
    """Response model for research results."""
    question: str
    prediction: str
    termination: str
    rounds: int
    elapsed_seconds: float
    messages: list
    research_plan: Optional[List[str]] = Field(None, description="Generated research sub-questions")


class DistributedResearchResponse(BaseModel):
    """Response model for distributed research job submission."""
    job_id: str
    status: str
    message: str
    stream_url: str


class AnalyzeQueryRequest(BaseModel):
    """Request model for query analysis and research planning."""
    query: str = Field(..., description="The research query to analyze")


class IdentifiedGap(BaseModel):
    """Model for an identified information gap."""
    type: str = Field(..., description="Gap type: ambiguity, scope, target_format, intent")
    description: str = Field(..., description="Description of the missing information")
    impact: Optional[str] = Field(None, description="Impact level of the gap")


class AnalyzeQueryResponse(BaseModel):
    """Response model for query analysis with confidence scoring."""
    confidence_score: int = Field(..., description="Confidence score 0-100")
    confidence_level: str = Field(..., description="Confidence level: high, medium, low")
    research_plan: List[str] = Field(default_factory=list, description="Research plan steps")
    identified_gaps: List[IdentifiedGap] = Field(default_factory=list, description="Identified information gaps")
    assumptions: List[str] = Field(default_factory=list, description="Assumptions for medium confidence")
    clarifying_questions: List[str] = Field(default_factory=list, description="Questions for low confidence")
    reasoning: str = Field("", description="Reasoning for the confidence assessment")
    needs_confirmation: bool = Field(False, description="True if plan needs user confirmation")
    needs_clarification: bool = Field(False, description="True if clarifying questions needed")
    can_proceed_immediately: bool = Field(False, description="True if research can proceed immediately")


# Global service instances
_agent: Optional[DeepResearchAgent] = None
_sandbox: Optional[SandboxService] = None
_config_service: Optional[ConfigurationService] = None


async def get_config_service() -> Optional[ConfigurationService]:
    """Get or create the ConfigurationService instance."""
    global _config_service
    if _config_service is None:
        logger.debug("=== get_config_service: Creating new ConfigurationService ===")

        try:
            # Check if required environment variables are set
            secret_key = os.getenv("SECRET_KEY")
            etcd_url = os.getenv("ETCD_URL")

            logger.debug(f"Environment check: SECRET_KEY present={bool(secret_key)}, ETCD_URL present={bool(etcd_url)}")

            if not secret_key:
                logger.warning(
                    "SECRET_KEY not set - ConfigurationService disabled. "
                    "SLM features will not be available."
                )
                logger.debug("=== get_config_service: Returning None (no SECRET_KEY) ===")
                return None

            if not etcd_url:
                logger.warning(
                    "ETCD_URL not set - ConfigurationService disabled. "
                    "SLM features will not be available."
                )
                logger.debug("=== get_config_service: Returning None (no ETCD_URL) ===")
                return None

            logger.debug("Creating Etcd3EncryptedKeyValueStore")
            key_value_store = Etcd3EncryptedKeyValueStore(logger=logger)

            logger.debug("Creating ConfigurationService")
            _config_service = ConfigurationService(
                logger=logger,
                key_value_store=key_value_store,
            )
            logger.info("ConfigurationService initialized for SLM support")
            logger.debug("=== get_config_service: ConfigurationService created successfully ===")
        except Exception as e:
            logger.warning(
                f"Failed to initialize ConfigurationService: {e}. "
                "SLM features will not be available."
            )
            logger.debug(f"Exception details: {str(e)}")
            _config_service = None
            logger.debug("=== get_config_service: Returning None (exception) ===")
    else:
        logger.debug("=== get_config_service: Returning cached ConfigurationService ===")

    return _config_service


async def get_agent() -> DeepResearchAgent:
    """Get or create the DeepResearch agent instance."""
    global _agent
    if _agent is None:
        logger.debug("=== get_agent: Creating new DeepResearch agent ===")

        # Get configuration from environment
        api_base = os.getenv("DEEPRESEARCH_API_BASE", "https://openrouter.ai/api/v1").strip()
        api_key = (os.getenv("DEEPRESEARCH_API_KEY") or os.getenv("OPENROUTER_API_KEY") or "").strip()
        model = os.getenv("DEEPRESEARCH_MODEL", "alibaba/tongyi-deepresearch-30b-a3b").strip()

        logger.debug(f"Agent config: api_base='{api_base}', model='{model}', api_key_present={bool(api_key)}")

        if not api_key:
            error_msg = (
                "DeepResearch API key is missing. "
                "Set DEEPRESEARCH_API_KEY or OPENROUTER_API_KEY in services/python/.env."
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)

        # Get ConfigurationService for SLM support (optional)
        logger.debug("Getting ConfigurationService for SLM support")
        config_service = await get_config_service()
        logger.debug(f"ConfigurationService available: {config_service is not None}")

        logger.debug("Initializing DeepResearchAgent")
        _agent = DeepResearchAgent(
            api_base=api_base,
            api_key=api_key,
            model=model,
            logger=logger,
            config_service=config_service,
        )
        logger.info(f"DeepResearch agent initialized with model: {model}")
        if config_service:
            logger.info("SLM support enabled via ConfigurationService")
        else:
            logger.warning("SLM support disabled - agent will use simple truncation for web content")

        logger.debug("=== get_agent: Agent created successfully ===")
    else:
        logger.debug("=== get_agent: Returning cached agent ===")

    return _agent


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan context manager for FastAPI."""
    logger.info("Starting DeepResearch service...")

    try:
        # Initialize sandbox service
        global _sandbox
        _sandbox = SandboxService(logger=logger)
        await _sandbox.initialize()
        set_sandbox_service(_sandbox)
        logger.info("Sandbox service initialized")

        # Pre-initialize agent
        await get_agent()

    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        # Don't raise - allow service to start, will fail on first request

    yield

    # Cleanup
    logger.info("Shutting down DeepResearch service...")
    if _sandbox:
        await _sandbox.cleanup()


# Create FastAPI app
app = FastAPI(
    lifespan=lifespan,
    title="DeepResearch Service",
    description="Deep research agent API using Tongyi-DeepResearch model",
    version="1.0.0",
)


@app.get("/health")
async def health_check() -> JSONResponse:
    """Health check endpoint."""
    logger.debug("=== health_check ENDPOINT CALLED ===")

    try:
        # Check sandbox health
        sandbox_healthy = False
        if _sandbox:
            logger.debug("Checking sandbox health")
            sandbox_healthy = await _sandbox.health_check()
            logger.debug(f"Sandbox health: {sandbox_healthy}")
        else:
            logger.debug("Sandbox not initialized")

        response_data = {
            "status": "healthy",
            "service": "deepresearch",
            "sandbox_healthy": sandbox_healthy,
            "timestamp": get_epoch_timestamp_in_ms(),
        }

        logger.debug(f"Health check response: {response_data}")
        logger.debug("=== health_check COMPLETED (SUCCESS) ===")

        return JSONResponse(
            status_code=HttpStatusCode.SUCCESS.value,
            content=response_data,
        )
    except Exception as e:
        logger.debug(f"Health check failed: {str(e)}")
        error_response = {
            "status": "unhealthy",
            "service": "deepresearch",
            "error": str(e),
            "timestamp": get_epoch_timestamp_in_ms(),
        }
        logger.debug("=== health_check COMPLETED (ERROR) ===")

        return JSONResponse(
            status_code=500,
            content=error_response,
        )


# Research Planning Prompt for DeepResearch model - comprehensive analysis with confidence scoring
ANALYZE_QUERY_PROMPT = """You are a deep research planning assistant. Before conducting expensive research operations, you must analyze the user's query and create a research plan.

**Current Date:** {current_date}
Use this date to resolve relative time expressions (e.g., "yesterday", "last month", "upcoming").

## CRITICAL: Hybrid Language Rules
You must strictly separate technical values from content:

1. **ENUMS & KEYS (Always English):**
   - JSON keys must be English.
   - Values for `confidence_level` must be: "high", "medium", "low".
   - Values for `type` in gaps must be: "ambiguity", "scope", "target_format", "intent".

2. **CONTENT (User's Language):**
   - The fields `research_plan`, `description`, `assumptions`, `clarifying_questions`, and `reasoning` MUST be in the **SAME LANGUAGE as the user's query**.
   - If the user asks in German, write the plan in German.

## Your Task
1. **Simulate the research path** - Create a preliminary plan with 3-7 concrete research steps.
2. **Perform Gap Analysis** - Identify missing info based on these categories:
   - **ambiguity**: Terms with multiple meanings.
   - **scope**: Missing time window, region, or boundaries.
   - **target_format**: Unclear output format.
   - **intent**: Unclear goal.
3. **Calculate Confidence Score** (0-100).

## Thresholds
- **90-100% (high)**: Clear parameters → Proceed immediately.
- **50-89% (medium)**: Assumptions possible → Show plan with assumptions.
- **0-49% (low)**: Too risky → Ask clarifying questions.

## User Query
{query}

## Response Format (JSON ONLY)
Respond with ONLY valid JSON. Do not add markdown formatting like ```json.
{{
  "confidence_score": <number 0-100>,
  "confidence_level": "<high|medium|low>",
  "research_plan": [
    "Step 1: ...",
    "Step 2: ...",
    "Step 3: ..."
  ],
  "identified_gaps": [
    {{
      "type": "<ambiguity|scope|target_format|intent>",
      "description": "What information is missing",
      "impact": "How this affects the research"
    }}
  ],
  "assumptions": [
    "If confidence is medium, list the assumptions you would make to proceed"
  ],
  "clarifying_questions": [
    "If confidence is low, list specific questions to ask the user"
  ],
  "reasoning": "Brief explanation of your confidence assessment"
}}"""


@app.post("/api/v1/research/analyze", response_model=AnalyzeQueryResponse)
async def analyze_query(request: AnalyzeQueryRequest) -> AnalyzeQueryResponse:
    """
    Analyze a research query and create a research plan with confidence scoring.

    This endpoint uses the DeepResearch model to:
    1. Analyze the query for clarity and completeness
    2. Generate a research plan with concrete steps
    3. Identify information gaps (ambiguity, scope, format, intent)
    4. Calculate a confidence score (0-100) with thresholds:
       - High (90-100%): Proceed immediately
       - Medium (50-89%): Show plan with assumptions, await confirmation
       - Low (0-49%): Ask clarifying questions

    Returns:
        AnalyzeQueryResponse with research plan, confidence score, and identified gaps
    """
    logger.debug("=== analyze_query ENDPOINT CALLED ===")
    logger.debug(f"Query to analyze: '{request.query[:100]}...'")

    try:
        from datetime import datetime

        import json5

        agent = await get_agent()

        current_date = datetime.now().strftime("%A, %Y-%m-%d")
        prompt = ANALYZE_QUERY_PROMPT.format(query=request.query, current_date=current_date)

        logger.debug("Calling DeepResearch model for query analysis")

        # Use the agent's LLM to analyze the query
        messages = [{"role": "user", "content": prompt}]
        response_text = agent.call_llm(messages, max_tries=3)

        logger.debug(f"Raw response: '{response_text[:500]}...'")

        # Parse the JSON response
        # Handle potential markdown code blocks
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        result = json5.loads(response_text)
        logger.debug(f"Parsed result: {result}")

        # Extract and validate confidence score
        confidence_score = result.get("confidence_score", 50)
        if isinstance(confidence_score, str):
            try:
                confidence_score = int(confidence_score)
            except ValueError:
                confidence_score = 50
        confidence_score = max(0, min(100, confidence_score))

        # Determine confidence level from score
        if confidence_score >= 90:
            confidence_level = "high"
        elif confidence_score >= 50:
            confidence_level = "medium"
        else:
            confidence_level = "low"

        # Override if explicitly set in response
        confidence_level = result.get("confidence_level", confidence_level)

        # Build identified gaps
        identified_gaps = []
        for gap in result.get("identified_gaps", []):
            identified_gaps.append(IdentifiedGap(
                type=gap.get("type", "scope"),
                description=gap.get("description", ""),
                impact=gap.get("impact"),
            ))

        response = AnalyzeQueryResponse(
            confidence_score=confidence_score,
            confidence_level=confidence_level,
            research_plan=result.get("research_plan", []),
            identified_gaps=identified_gaps,
            assumptions=result.get("assumptions", []),
            clarifying_questions=result.get("clarifying_questions", []),
            reasoning=result.get("reasoning", ""),
            needs_confirmation=confidence_level == "medium",
            needs_clarification=confidence_level == "low",
            can_proceed_immediately=confidence_level == "high",
        )

        logger.info(f"Query analysis complete: confidence={confidence_score}% ({confidence_level})")
        logger.debug("=== analyze_query ENDPOINT COMPLETED (SUCCESS) ===")

        return response

    except Exception as e:
        logger.error(f"Query analysis failed: {e}", exc_info=True)
        logger.debug("=== analyze_query ENDPOINT COMPLETED (ERROR) ===")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/research", response_model=ResearchResponse)
async def run_research(request: ResearchRequest) -> ResearchResponse:
    """
    Run a deep research query (synchronous mode).

    This endpoint executes the DeepResearch agent on the given question,
    using web search, page visits, and code execution to find answers.

    For distributed/parallel execution, use POST /api/v1/research/distributed
    or set distributed=true in the request body.

    SOTA Features:
    - Chain of Thought (CoT) reasoning with <think> tags
    - Planning phase to break down complex questions
    - SLM-based intelligent content extraction from webpages
    """
    logger.debug("=== run_research ENDPOINT CALLED ===")
    logger.debug(f"Request: question='{request.question[:100]}...', max_rounds={request.max_rounds}, max_time_minutes={request.max_time_minutes}, enable_planning={request.enable_planning}, distributed={request.distributed}")

    # If distributed mode requested, redirect to distributed endpoint
    if request.distributed:
        logger.debug("Distributed mode requested, redirecting to distributed endpoint")
        return await run_distributed_research_endpoint(request)

    try:
        logger.debug("Getting DeepResearch agent")
        agent = await get_agent()

        logger.info(f"Starting research for: {request.question[:100]}...")
        logger.debug(f"Agent run parameters: max_rounds={request.max_rounds}, max_time_minutes={request.max_time_minutes or 150}, enable_planning={request.enable_planning}")

        # If a pre-defined research plan is provided, use it and skip planning
        use_planning = request.enable_planning and not request.research_plan

        result = await agent.run(
            question=request.question,
            max_rounds=request.max_rounds,
            max_time_minutes=request.max_time_minutes or 150,
            enable_planning=use_planning,
            research_plan=request.research_plan,
        )

        logger.info(f"Research completed: {result['termination']}")
        logger.debug(f"Result summary: rounds={result['rounds']}, elapsed_seconds={result['elapsed_seconds']}, termination='{result['termination']}'")
        logger.debug(f"Result has research_plan: {result.get('research_plan') is not None}")
        logger.debug(f"Result prediction length: {len(result['prediction'])}")

        response = ResearchResponse(
            question=result["question"],
            prediction=result["prediction"],
            termination=result["termination"],
            rounds=result["rounds"],
            elapsed_seconds=result["elapsed_seconds"],
            messages=result["messages"],
            research_plan=result.get("research_plan"),
        )

        logger.debug("=== run_research ENDPOINT COMPLETED (SUCCESS) ===")
        return response

    except Exception as e:
        logger.error(f"Research failed: {e}")
        logger.debug(f"Exception type: {type(e).__name__}")
        logger.debug("=== run_research ENDPOINT COMPLETED (ERROR) ===")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/research/distributed", response_model=DistributedResearchResponse)
async def run_distributed_research_endpoint(request: ResearchRequest) -> DistributedResearchResponse:
    """
    Submit a deep research query for distributed/parallel execution.

    This endpoint enqueues the research job to Celery workers for parallel
    processing. Each sub-question from the research plan is executed
    simultaneously by different workers.

    Returns a job_id that can be used to stream results via:
    GET /api/v1/research/stream/{job_id}

    Benefits:
    - Faster execution through parallel sub-task processing
    - Better scalability for high-concurrency scenarios
    - Real-time streaming updates via Redis Pub/Sub
    """
    logger.debug("=== run_distributed_research_endpoint CALLED ===")
    logger.debug(f"Request: question='{request.question[:100]}...', enable_planning={request.enable_planning}, max_parallel_subtasks={request.max_parallel_subtasks}")

    try:
        logger.debug("Importing distributed research tasks")
        from app.services.deepresearch.tasks import run_distributed_research

        job_id = f"dr-{uuid.uuid4().hex[:12]}"
        logger.debug(f"Generated job_id: {job_id}")

        logger.info(f"Submitting distributed research job {job_id}: {request.question[:100]}...")

        # Enqueue the job
        logger.debug("Calling run_distributed_research task")
        await run_distributed_research(
            question=request.question,
            job_id=job_id,
            enable_planning=request.enable_planning,
            max_parallel_subtasks=request.max_parallel_subtasks,
        )

        response = DistributedResearchResponse(
            job_id=job_id,
            status="queued",
            message="Research job submitted for distributed processing",
            stream_url=f"/api/v1/research/stream/{job_id}",
        )

        logger.debug(f"Distributed research job submitted successfully: {job_id}")
        logger.debug("=== run_distributed_research_endpoint COMPLETED (SUCCESS) ===")
        return response

    except ImportError as e:
        logger.error(f"Celery tasks not available: {e}")
        logger.debug("ImportError - Celery tasks not available")
        logger.debug("=== run_distributed_research_endpoint COMPLETED (IMPORT ERROR) ===")
        raise HTTPException(
            status_code=503,
            detail="Distributed processing is not available. Celery workers may not be running.",
        )
    except Exception as e:
        logger.error(f"Failed to submit distributed research: {e}")
        logger.debug(f"Exception type: {type(e).__name__}")
        logger.debug("=== run_distributed_research_endpoint COMPLETED (ERROR) ===")
        raise HTTPException(status_code=500, detail=str(e))


def _create_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """Format data as a Server-Sent Event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/v1/research/stream")
async def run_research_stream(request: ResearchRequest) -> StreamingResponse:
    """
    Run a deep research query with streaming responses.

    If distributed=true, submits to Celery workers and streams via Redis Pub/Sub.
    Otherwise, runs directly in the API process with yield-based streaming.

    Returns Server-Sent Events with progress updates including:
    - status: General status updates
    - plan: Research plan with sub-questions
    - subtask_started/subtask_completed: Parallel subtask progress (distributed mode)
    - thinking_chunk/thinking_complete: Chain of Thought reasoning
    - tool_call/tool_result: Tool usage updates
    - web_search/web_results: Search progress and sources
    - answer_chunk: Streaming answer content
    - complete: Final response with all data
    """
    logger.debug("=== run_research_stream ENDPOINT CALLED ===")
    logger.debug(f"Request: question='{request.question[:100]}...', max_rounds={request.max_rounds}, max_time_minutes={request.max_time_minutes}, enable_planning={request.enable_planning}, distributed={request.distributed}")

    if request.distributed:
        logger.debug("Using distributed mode (Celery + Redis streaming)")
        # Distributed mode: use Celery + Redis streaming
        return await _stream_distributed_research(request)
    else:
        logger.debug("Using direct mode (yield-based streaming)")
        # Direct mode: yield-based streaming
        return await _stream_direct_research(request)


async def _stream_direct_research(request: ResearchRequest) -> StreamingResponse:
    """Stream research results directly from the agent (single-process mode)."""

    logger.debug("=== _stream_direct_research STARTED ===")

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            logger.debug("Getting DeepResearch agent for direct streaming")
            agent = await get_agent()

            logger.info(f"Starting streaming research for: {request.question[:100]}...")

            # If a pre-defined research plan is provided, use it and skip planning
            use_planning = request.enable_planning and not request.research_plan
            logger.debug(f"Stream parameters: max_rounds={request.max_rounds}, max_time_minutes={request.max_time_minutes or 150}, enable_planning={use_planning}, has_research_plan={request.research_plan is not None}")

            event_count = 0
            async for event in agent.run_stream(
                question=request.question,
                max_rounds=request.max_rounds,
                max_time_minutes=request.max_time_minutes or 150,
                enable_planning=use_planning,
                research_plan=request.research_plan,
            ):
                event_count += 1
                event_type = event.get("event", "status")
                event_data = event.get("data", {})

                logger.debug(f"Streaming event {event_count}: {event_type} - {event_data.get('step', event_type)}")
                if event_type == "complete":
                    logger.debug(f"Final event data keys: {list(event_data.keys())}")

                yield _create_sse_event(event_type, event_data)

            logger.debug(f"Direct streaming completed. Total events: {event_count}")
            logger.debug("=== _stream_direct_research COMPLETED (SUCCESS) ===")

        except Exception as e:
            logger.error(f"Streaming research failed: {e}", exc_info=True)
            logger.debug(f"Exception type: {type(e).__name__}")
            error_event = {
                "step": "error",
                "message": str(e),
                "error": str(e),
            }
            yield _create_sse_event("error", error_event)
            logger.debug("=== _stream_direct_research COMPLETED (ERROR) ===")

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


async def _stream_distributed_research(request: ResearchRequest) -> StreamingResponse:
    """Stream research results from Celery workers via Redis Pub/Sub."""

    logger.debug("=== _stream_distributed_research STARTED ===")

    async def generate_stream() -> AsyncGenerator[str, None]:
        job_id = f"dr-{uuid.uuid4().hex[:12]}"
        logger.debug(f"Generated job_id: {job_id}")

        try:
            logger.debug("Importing distributed research tasks")
            from app.services.deepresearch.tasks import orchestrate_research_task

            logger.info(f"Starting distributed streaming research {job_id}: {request.question[:100]}...")
            logger.debug(f"Distributed parameters: enable_planning={request.enable_planning}, max_parallel_subtasks={request.max_parallel_subtasks}")

            # Emit initial event
            logger.debug("Emitting initial queued event")
            yield _create_sse_event("status", {
                "step": "queued",
                "message": "Research job submitted for distributed processing",
                "job_id": job_id,
            })

            # Enqueue the orchestrator task
            logger.debug("Enqueueing orchestrator task")
            orchestrate_research_task.delay(
                job_id=job_id,
                question=request.question,
                enable_planning=request.enable_planning,
                max_parallel_subtasks=request.max_parallel_subtasks,
            )

            # Listen to Redis channel for events
            timeout_seconds = request.max_time_minutes * 60 if request.max_time_minutes else 600
            logger.debug(f"Setting up Redis listener with timeout: {timeout_seconds}s")
            listener = RedisStreamListener(
                job_id=job_id,
                timeout=timeout_seconds,
            )

            logger.debug("Connecting to Redis listener")
            await listener.connect()

            event_count = 0
            async for event in listener.listen():
                event_count += 1
                logger.debug(f"Received distributed event {event_count}: {event}")
                yield format_sse_event(event)

            logger.debug(f"Distributed streaming completed. Total events: {event_count}")
            logger.debug("=== _stream_distributed_research COMPLETED (SUCCESS) ===")

        except ImportError as e:
            logger.error(f"Celery tasks not available: {e}")
            logger.debug("ImportError - Celery tasks not available")
            yield _create_sse_event("error", {
                "step": "error",
                "message": "Distributed processing is not available",
                "error": str(e),
            })
            logger.debug("=== _stream_distributed_research COMPLETED (IMPORT ERROR) ===")
        except Exception as e:
            logger.error(f"Distributed streaming research failed: {e}", exc_info=True)
            logger.debug(f"Exception type: {type(e).__name__}")
            yield _create_sse_event("error", {
                "step": "error",
                "message": str(e),
                "error": str(e),
            })
            logger.debug("=== _stream_distributed_research COMPLETED (ERROR) ===")

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


@app.get("/api/v1/research/stream/{job_id}")
async def stream_research_by_job_id(
    job_id: str,
    timeout: int = Query(default=600, description="Stream timeout in seconds"),
) -> StreamingResponse:
    """
    Stream research results for an existing job via Redis Pub/Sub.

    Use this endpoint after submitting a job via POST /api/v1/research/distributed
    to receive real-time updates.

    Args:
        job_id: The job identifier returned from the distributed endpoint
        timeout: Maximum time to wait for events (seconds)
    """
    logger.debug("=== stream_research_by_job_id ENDPOINT CALLED ===")
    logger.debug(f"Job ID: {job_id}, Timeout: {timeout}s")

    async def generate_stream() -> AsyncGenerator[str, None]:
        try:
            logger.info(f"Connecting to stream for job {job_id}...")
            logger.debug(f"Creating Redis listener for job {job_id}")

            listener = RedisStreamListener(
                job_id=job_id,
                timeout=float(timeout),
            )

            logger.debug("Connecting to Redis listener")
            await listener.connect()

            logger.debug("Emitting connected event")
            yield _create_sse_event("status", {
                "step": "connected",
                "message": f"Connected to research job {job_id}",
                "job_id": job_id,
            })

            event_count = 0
            async for event in listener.listen():
                event_count += 1
                logger.debug(f"Received job event {event_count}: {event}")
                yield format_sse_event(event)

            logger.debug(f"Job streaming completed. Total events: {event_count}")
            logger.debug("=== stream_research_by_job_id COMPLETED (SUCCESS) ===")

        except Exception as e:
            logger.error(f"Stream connection failed for job {job_id}: {e}", exc_info=True)
            logger.debug(f"Exception type: {type(e).__name__}")
            yield _create_sse_event("error", {
                "step": "error",
                "message": str(e),
                "error": str(e),
                "job_id": job_id,
            })
            logger.debug("=== stream_research_by_job_id COMPLETED (ERROR) ===")

    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    )


def run(host: str = "0.0.0.0", port: int = 8090, reload: bool = False) -> None:
    """Run the DeepResearch service."""
    uvicorn.run(
        "app.research_main:app",
        host=host,
        port=port,
        log_level="info",
        reload=reload,
    )


if __name__ == "__main__":
    run(reload=False)
