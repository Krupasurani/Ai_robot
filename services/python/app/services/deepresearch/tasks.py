"""
Celery Tasks for DeepResearch Distributed Processing.

Provides task orchestration for parallel research execution:
1. orchestrate_research_task - Main entry point, generates plan and spawns subtasks
2. execute_sub_research_task - Executes a single sub-question research
3. synthesize_results_task - Combines all findings into final answer

Uses Redis Pub/Sub for real-time streaming to connected clients.
"""

import asyncio
import os
import uuid
from typing import Any, Dict, List, Optional

from celery import chord
from celery.utils.log import get_task_logger

from app.core.celery_app import celery
from libs.core.logging import create_logger

logger = get_task_logger(__name__)
sync_logger = create_logger("deepresearch_tasks")

# Task queue name for deep research workers
DEEP_RESEARCH_QUEUE = "deep_research"

# Default configuration
DEFAULT_MAX_SUBTASK_ROUNDS = 30
DEFAULT_MAX_SUBTASK_TIME_MINUTES = 30
DEFAULT_MAX_PARALLEL_SUBTASKS = 5


def _get_redis_url() -> str:
    """Get Redis URL from environment."""
    return os.getenv("REDIS_URL", "redis://localhost:6379")


def _run_async(coro):
    """Run an async coroutine in a sync context."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _get_agent():
    """Create a DeepResearchAgent instance."""
    from app.services.deepresearch.agent import DeepResearchAgent
    from libs.core.config import ConfigurationService
    from libs.core.config.providers.etcd import Etcd3EncryptedKeyValueStore

    api_base = os.getenv("DEEPRESEARCH_API_BASE", "https://openrouter.ai/api/v1").strip()
    api_key = (os.getenv("DEEPRESEARCH_API_KEY") or os.getenv("OPENROUTER_API_KEY") or "").strip()
    model = os.getenv("DEEPRESEARCH_MODEL", "alibaba/tongyi-deepresearch-30b-a3b").strip()

    if not api_key:
        raise RuntimeError("DeepResearch API key is missing.")

    # Try to get config service for SLM support
    config_service = None
    try:
        if os.getenv("SECRET_KEY") and os.getenv("ETCD_URL"):
            key_value_store = Etcd3EncryptedKeyValueStore(logger=sync_logger)
            config_service = ConfigurationService(
                logger=sync_logger,
                key_value_store=key_value_store,
            )
    except Exception as e:
        sync_logger.warning(f"Failed to initialize ConfigurationService: {e}")

    return DeepResearchAgent(
        api_base=api_base,
        api_key=api_key,
        model=model,
        logger=sync_logger,
        config_service=config_service,
    )


async def _get_publisher(job_id: str):
    """Create a RedisStreamPublisher instance."""
    from app.services.deepresearch.stream import RedisStreamPublisher

    publisher = RedisStreamPublisher(job_id=job_id, redis_url=_get_redis_url())
    await publisher.connect()
    return publisher


@celery.task(
    name="deepresearch.orchestrate",
    bind=True,
    queue=DEEP_RESEARCH_QUEUE,
    max_retries=2,
    soft_time_limit=600,
    time_limit=660,
)
def orchestrate_research_task(
    self,
    job_id: str,
    question: str,
    enable_planning: bool = True,
    max_parallel_subtasks: int = DEFAULT_MAX_PARALLEL_SUBTASKS,
    max_subtask_rounds: int = DEFAULT_MAX_SUBTASK_ROUNDS,
    max_subtask_time_minutes: int = DEFAULT_MAX_SUBTASK_TIME_MINUTES,
) -> Dict[str, Any]:
    """
    Main orchestrator task for deep research.

    1. Generates a research plan (sub-questions)
    2. Spawns parallel subtasks for each sub-question
    3. Chains to synthesis task to combine results

    Args:
        job_id: Unique identifier for this research job
        question: The main research question
        enable_planning: Whether to generate a research plan
        max_parallel_subtasks: Maximum concurrent subtasks
        max_subtask_rounds: Max LLM rounds per subtask
        max_subtask_time_minutes: Time limit per subtask

    Returns:
        Dict with job metadata (actual results come via Redis)
    """
    return _run_async(
        _orchestrate_research_async(
            job_id=job_id,
            question=question,
            enable_planning=enable_planning,
            max_parallel_subtasks=max_parallel_subtasks,
            max_subtask_rounds=max_subtask_rounds,
            max_subtask_time_minutes=max_subtask_time_minutes,
        )
    )


async def _orchestrate_research_async(
    job_id: str,
    question: str,
    enable_planning: bool,
    max_parallel_subtasks: int,
    max_subtask_rounds: int,
    max_subtask_time_minutes: int,
) -> Dict[str, Any]:
    """Async implementation of orchestrate_research_task."""
    publisher = await _get_publisher(job_id)

    try:
        await publisher.publish_status("orchestration_started", "Starting research orchestration...")

        agent = await _get_agent()

        # Initialize SLM for planning
        await agent._initialize_slm()

        # Generate research plan
        research_plan: List[str] = []
        if enable_planning:
            await publisher.publish_status("planning", "Analyzing question and creating research plan...")
            research_plan = await agent.generate_plan(question)
            await publisher.publish_plan(research_plan)
        else:
            research_plan = [question]

        # Limit parallel subtasks
        if len(research_plan) > max_parallel_subtasks:
            sync_logger.warning(
                f"Research plan has {len(research_plan)} sub-questions, "
                f"limiting to {max_parallel_subtasks}"
            )
            research_plan = research_plan[:max_parallel_subtasks]

        # Generate subtask IDs
        subtask_configs = []
        for i, sub_question in enumerate(research_plan):
            subtask_id = f"{job_id}-sub-{i}"
            subtask_configs.append({
                "subtask_id": subtask_id,
                "sub_question": sub_question,
                "index": i,
                "total": len(research_plan),
            })

            await publisher.publish_subtask_started(
                subtask_id=subtask_id,
                sub_question=sub_question,
                index=i,
                total=len(research_plan),
            )

        await publisher.publish_status(
            "subtasks_spawned",
            f"Spawning {len(research_plan)} parallel research tasks...",
            subtaskCount=len(research_plan),
        )

        # Create parallel subtask group
        subtask_signatures = [
            execute_sub_research_task.s(
                job_id=job_id,
                subtask_id=config["subtask_id"],
                sub_question=config["sub_question"],
                context=question,
                index=config["index"],
                total=config["total"],
                max_rounds=max_subtask_rounds,
                max_time_minutes=max_subtask_time_minutes,
            )
            for config in subtask_configs
        ]

        # Use chord to run subtasks in parallel, then synthesize
        callback = synthesize_results_task.s(
            job_id=job_id,
            original_question=question,
            research_plan=research_plan,
        )

        # Execute chord (parallel subtasks -> synthesis)
        result = chord(subtask_signatures)(callback)

        return {
            "job_id": job_id,
            "status": "orchestrated",
            "subtask_count": len(research_plan),
            "chord_id": result.id,
        }

    except Exception as e:
        sync_logger.error(f"Orchestration failed: {e}", exc_info=True)
        await publisher.publish_error(str(e))
        raise
    finally:
        await publisher.close()


@celery.task(
    name="deepresearch.execute_subtask",
    bind=True,
    queue=DEEP_RESEARCH_QUEUE,
    max_retries=1,
    soft_time_limit=1800,
    time_limit=1860,
)
def execute_sub_research_task(
    self,
    job_id: str,
    subtask_id: str,
    sub_question: str,
    context: str,
    index: int,
    total: int,
    max_rounds: int = DEFAULT_MAX_SUBTASK_ROUNDS,
    max_time_minutes: int = DEFAULT_MAX_SUBTASK_TIME_MINUTES,
) -> Dict[str, Any]:
    """
    Execute research on a single sub-question.

    This task runs in parallel with other subtasks.

    Args:
        job_id: Parent job identifier
        subtask_id: Unique identifier for this subtask
        sub_question: The specific sub-question to research
        context: Context from the main question
        index: Index of this subtask (0-based)
        total: Total number of subtasks
        max_rounds: Maximum LLM call rounds
        max_time_minutes: Time limit for this subtask

    Returns:
        Dict with findings, sources, and metadata
    """
    return _run_async(
        _execute_sub_research_async(
            job_id=job_id,
            subtask_id=subtask_id,
            sub_question=sub_question,
            context=context,
            index=index,
            total=total,
            max_rounds=max_rounds,
            max_time_minutes=max_time_minutes,
        )
    )


async def _execute_sub_research_async(
    job_id: str,
    subtask_id: str,
    sub_question: str,
    context: str,
    index: int,
    total: int,
    max_rounds: int,
    max_time_minutes: int,
) -> Dict[str, Any]:
    """Async implementation of execute_sub_research_task."""
    publisher = await _get_publisher(job_id)

    try:
        agent = await _get_agent()

        # Run the subtask with publisher for streaming updates
        result = await agent.run_subtask(
            sub_question=sub_question,
            context=context,
            subtask_id=subtask_id,
            max_rounds=max_rounds,
            max_time_minutes=max_time_minutes,
            publisher=publisher,
        )

        # Publish completion
        await publisher.publish_subtask_completed(
            subtask_id=subtask_id,
            sub_question=sub_question,
            index=index,
            total=total,
            findings=result.get("findings", ""),
        )

        # Return serializable result (exclude messages to reduce size)
        return {
            "subtask_id": subtask_id,
            "sub_question": sub_question,
            "findings": result.get("findings", ""),
            "thinking": result.get("thinking", ""),
            "sources": result.get("sources", []),
            "termination": result.get("termination", "unknown"),
            "rounds": result.get("rounds", 0),
            "elapsed_seconds": result.get("elapsed_seconds", 0),
            "index": index,
        }

    except Exception as e:
        sync_logger.error(f"Subtask {subtask_id} failed: {e}", exc_info=True)
        await publisher.publish(
            "subtask_error",
            "subtask_failed",
            f"Subtask {index + 1}/{total} failed: {e}",
            subtaskId=subtask_id,
            error=str(e),
        )
        # Return error result so synthesis can continue
        return {
            "subtask_id": subtask_id,
            "sub_question": sub_question,
            "findings": f"Error: {e}",
            "thinking": "",
            "sources": [],
            "termination": "error",
            "rounds": 0,
            "elapsed_seconds": 0,
            "index": index,
            "error": str(e),
        }
    finally:
        await publisher.close()


@celery.task(
    name="deepresearch.synthesize",
    bind=True,
    queue=DEEP_RESEARCH_QUEUE,
    max_retries=2,
    soft_time_limit=300,
    time_limit=360,
)
def synthesize_results_task(
    self,
    subtask_results: List[Dict[str, Any]],
    job_id: str,
    original_question: str,
    research_plan: List[str],
) -> Dict[str, Any]:
    """
    Synthesize findings from all subtasks into a final answer.

    This task runs after all subtasks complete (via chord callback).

    Args:
        subtask_results: List of results from execute_sub_research_task
        job_id: Parent job identifier
        original_question: The original research question
        research_plan: The research plan that was executed

    Returns:
        Dict with final answer and complete metadata
    """
    return _run_async(
        _synthesize_results_async(
            subtask_results=subtask_results,
            job_id=job_id,
            original_question=original_question,
            research_plan=research_plan,
        )
    )


async def _synthesize_results_async(
    subtask_results: List[Dict[str, Any]],
    job_id: str,
    original_question: str,
    research_plan: List[str],
) -> Dict[str, Any]:
    """Async implementation of synthesize_results_task."""
    publisher = await _get_publisher(job_id)

    try:
        await publisher.publish_synthesis_started()

        agent = await _get_agent()

        # Sort results by index to maintain order
        sorted_results = sorted(subtask_results, key=lambda x: x.get("index", 0))

        # Synthesize findings
        result = await agent.synthesize_findings(
            original_question=original_question,
            subtask_results=sorted_results,
            research_plan=research_plan,
            publisher=publisher,
        )

        # Calculate total elapsed time
        total_elapsed = sum(r.get("elapsed_seconds", 0) for r in sorted_results)
        total_elapsed += result.get("elapsed_seconds", 0)

        # Collect all sources
        all_sources = []
        for r in sorted_results:
            for source in r.get("sources", []):
                if source not in all_sources:
                    all_sources.append(source)

        # Publish final completion
        await publisher.publish_complete(
            answer=result.get("prediction", ""),
            termination=result.get("termination", "synthesized"),
            rounds=sum(r.get("rounds", 0) for r in sorted_results),
            elapsed_seconds=total_elapsed,
            sources=all_sources,
            research_plan=research_plan,
            thinking=result.get("thinking"),
        )

        return {
            "job_id": job_id,
            "question": original_question,
            "prediction": result.get("prediction", ""),
            "termination": result.get("termination", "synthesized"),
            "rounds": sum(r.get("rounds", 0) for r in sorted_results),
            "elapsed_seconds": total_elapsed,
            "sources": all_sources,
            "research_plan": research_plan,
            "subtask_count": len(sorted_results),
            "thinking": result.get("thinking"),
        }

    except Exception as e:
        sync_logger.error(f"Synthesis failed: {e}", exc_info=True)
        await publisher.publish_error(f"Synthesis failed: {e}")
        raise
    finally:
        await publisher.close()


# Convenience function for non-Celery usage (direct async call)
async def run_distributed_research(
    question: str,
    job_id: Optional[str] = None,
    enable_planning: bool = True,
    max_parallel_subtasks: int = DEFAULT_MAX_PARALLEL_SUBTASKS,
) -> str:
    """
    Enqueue a distributed research job.

    This is the main entry point for the API layer.

    Args:
        question: The research question
        job_id: Optional job ID (generated if not provided)
        enable_planning: Whether to generate a research plan
        max_parallel_subtasks: Maximum concurrent subtasks

    Returns:
        The job_id for tracking
    """
    if not job_id:
        job_id = f"dr-{uuid.uuid4().hex[:12]}"

    # Enqueue the orchestrator task
    orchestrate_research_task.delay(
        job_id=job_id,
        question=question,
        enable_planning=enable_planning,
        max_parallel_subtasks=max_parallel_subtasks,
    )

    return job_id

