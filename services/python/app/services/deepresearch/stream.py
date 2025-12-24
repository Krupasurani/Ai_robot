"""
Redis Pub/Sub Stream Publisher for DeepResearch.

Provides a unified interface for publishing research progress events
to Redis channels, enabling real-time streaming to connected clients.
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, Optional

import redis.asyncio as aioredis

from libs.core.logging import create_logger

logger = create_logger("deepresearch_stream")


def _utc_timestamp() -> str:
    """Return an ISO 8601 UTC timestamp."""
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


class RedisStreamPublisher:
    """
    Publishes structured SSE events to a Redis Pub/Sub channel.

    Each research job gets its own channel: `research:{job_id}`.
    Events follow the same structure as the existing SSE events.
    """

    def __init__(
        self,
        job_id: str,
        redis_url: Optional[str] = None,
    ):
        """
        Initialize the publisher.

        Args:
            job_id: Unique identifier for the research job
            redis_url: Redis connection URL (defaults to REDIS_URL env var)
        """
        self.job_id = job_id
        self.channel = f"research:{job_id}"
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._client: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        """Establish connection to Redis."""
        if self._client is None:
            self._client = await aioredis.from_url(
                self._redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            logger.debug(f"Connected to Redis for job {self.job_id}")

    async def close(self) -> None:
        """Close the Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None
            logger.debug(f"Closed Redis connection for job {self.job_id}")

    async def publish(
        self,
        event_type: str,
        step: str,
        message: Optional[str] = None,
        **extra: Any,
    ) -> None:
        """
        Publish an event to the research channel.

        Args:
            event_type: Type of event (status, plan, thinking_chunk, etc.)
            step: Current step identifier
            message: Human-readable message
            **extra: Additional event data
        """
        if self._client is None:
            await self.connect()

        payload: Dict[str, Any] = {
            "timestamp": _utc_timestamp(),
            "step": step,
            "job_id": self.job_id,
        }
        if message:
            payload["message"] = message
        for key, value in extra.items():
            if value is not None:
                payload[key] = value

        event = {
            "event": event_type,
            "data": payload,
        }

        await self._client.publish(self.channel, json.dumps(event))
        logger.debug(f"[{self.job_id}] Published {event_type}:{step}")

    async def publish_status(self, step: str, message: str, **extra: Any) -> None:
        """Shortcut for status events."""
        await self.publish("status", step, message, **extra)

    async def publish_plan(self, sub_questions: list, **extra: Any) -> None:
        """Publish research plan event."""
        await self.publish(
            "plan",
            "plan_created",
            f"Created research plan with {len(sub_questions)} sub-questions",
            subQuestions=sub_questions,
            questionCount=len(sub_questions),
            **extra,
        )

    async def publish_thinking(self, chunk: str, **extra: Any) -> None:
        """Publish thinking chunk event."""
        preview = chunk[:200] + "..." if len(chunk) > 200 else chunk
        await self.publish(
            "thinking_chunk",
            "thinking",
            preview,
            chunk=chunk,
            **extra,
        )

    async def publish_tool_call(
        self,
        tool_name: str,
        tool_args: Dict[str, Any],
        message: Optional[str] = None,
        **extra: Any,
    ) -> None:
        """Publish tool call event."""
        await self.publish(
            "tool_call",
            "tool_call",
            message or f"Using tool: {tool_name}",
            toolName=tool_name,
            toolArgs=tool_args,
            **extra,
        )

    async def publish_tool_result(
        self,
        tool_name: str,
        result_preview: str,
        result_length: int,
        **extra: Any,
    ) -> None:
        """Publish tool result event."""
        await self.publish(
            "tool_result",
            "tool_complete",
            f"Tool {tool_name} completed",
            toolName=tool_name,
            resultPreview=result_preview,
            resultLength=result_length,
            **extra,
        )

    async def publish_web_search(self, queries: list, **extra: Any) -> None:
        """Publish web search event."""
        await self.publish(
            "web_search",
            "searching",
            f"Searching: {queries[0] if queries else 'web'}...",
            queries=queries,
            **extra,
        )

    async def publish_web_results(self, sources: list, **extra: Any) -> None:
        """Publish web results event."""
        await self.publish(
            "web_results",
            "sources_ready",
            f"Found {len(sources)} sources",
            sources=sources,
            totalResults=len(sources),
            **extra,
        )

    async def publish_answer_chunk(self, chunk: str, **extra: Any) -> None:
        """Publish answer chunk event."""
        await self.publish(
            "answer_chunk",
            "answer",
            None,
            chunk=chunk,
            **extra,
        )

    async def publish_subtask_started(
        self,
        subtask_id: str,
        sub_question: str,
        index: int,
        total: int,
        **extra: Any,
    ) -> None:
        """Publish subtask started event."""
        await self.publish(
            "subtask_started",
            "subtask_started",
            f"Starting sub-task {index + 1}/{total}: {sub_question[:50]}...",
            subtaskId=subtask_id,
            subQuestion=sub_question,
            index=index,
            total=total,
            **extra,
        )

    async def publish_subtask_completed(
        self,
        subtask_id: str,
        sub_question: str,
        index: int,
        total: int,
        findings: str,
        **extra: Any,
    ) -> None:
        """Publish subtask completed event."""
        await self.publish(
            "subtask_completed",
            "subtask_completed",
            f"Completed sub-task {index + 1}/{total}",
            subtaskId=subtask_id,
            subQuestion=sub_question,
            index=index,
            total=total,
            findingsPreview=findings[:500] if findings else "",
            **extra,
        )

    async def publish_synthesis_started(self, **extra: Any) -> None:
        """Publish synthesis started event."""
        await self.publish(
            "status",
            "synthesis_started",
            "Synthesizing findings from all research tasks...",
            **extra,
        )

    async def publish_complete(
        self,
        answer: str,
        termination: str,
        rounds: int,
        elapsed_seconds: float,
        sources: list,
        research_plan: list,
        thinking: Optional[str] = None,
        **extra: Any,
    ) -> None:
        """Publish completion event with full response."""
        await self.publish(
            "complete",
            "complete",
            "Deep research completed",
            answer=answer,
            termination=termination,
            rounds=rounds,
            elapsedSeconds=elapsed_seconds,
            sources=sources,
            researchPlan=research_plan,
            thinking=thinking,
            **extra,
        )

    async def publish_error(self, error: str, **extra: Any) -> None:
        """Publish error event."""
        await self.publish(
            "error",
            "error",
            error,
            error=error,
            **extra,
        )


class RedisStreamListener:
    """
    Listens to a Redis Pub/Sub channel and yields events.

    Used by the API layer to stream events to connected SSE clients.
    """

    def __init__(
        self,
        job_id: str,
        redis_url: Optional[str] = None,
        timeout: float = 600.0,
    ):
        """
        Initialize the listener.

        Args:
            job_id: Unique identifier for the research job
            redis_url: Redis connection URL
            timeout: Maximum time to listen (seconds)
        """
        self.job_id = job_id
        self.channel = f"research:{job_id}"
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self._timeout = timeout
        self._client: Optional[aioredis.Redis] = None
        self._pubsub: Optional[aioredis.client.PubSub] = None

    async def connect(self) -> None:
        """Establish connection and subscribe to channel."""
        self._client = await aioredis.from_url(
            self._redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        self._pubsub = self._client.pubsub()
        await self._pubsub.subscribe(self.channel)
        logger.debug(f"Subscribed to channel {self.channel}")

    async def close(self) -> None:
        """Clean up connections."""
        if self._pubsub:
            await self._pubsub.unsubscribe(self.channel)
            await self._pubsub.close()
            self._pubsub = None
        if self._client:
            await self._client.close()
            self._client = None
        logger.debug(f"Closed listener for channel {self.channel}")

    async def listen(self):
        """
        Async generator that yields events from the channel.

        Yields:
            Dict with 'event' and 'data' keys
        """
        import asyncio

        if self._pubsub is None:
            await self.connect()

        start_time = asyncio.get_event_loop().time()

        try:
            while True:
                # Check timeout
                elapsed = asyncio.get_event_loop().time() - start_time
                if elapsed > self._timeout:
                    logger.warning(f"Listener timeout for job {self.job_id}")
                    break

                # Get message with timeout
                try:
                    message = await asyncio.wait_for(
                        self._pubsub.get_message(
                            ignore_subscribe_messages=True,
                            timeout=1.0,
                        ),
                        timeout=5.0,
                    )
                except asyncio.TimeoutError:
                    continue

                if message is None:
                    continue

                if message["type"] == "message":
                    try:
                        event = json.loads(message["data"])
                        yield event

                        # Check for terminal events
                        event_type = event.get("event")
                        if event_type in ("complete", "error"):
                            logger.debug(f"Terminal event received for job {self.job_id}")
                            break

                    except json.JSONDecodeError as e:
                        logger.warning(f"Failed to parse message: {e}")
                        continue

        finally:
            await self.close()


def format_sse_event(event: Dict[str, Any]) -> str:
    """Format a Redis event as an SSE string."""
    event_type = event.get("event", "status")
    data = event.get("data", {})
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

