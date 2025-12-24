# DeepResearch Agent Service
# Migrated from DeepResearch/inference for integration with Thero AI stack
# Updated with distributed processing via Celery + Redis Pub/Sub

from app.services.deepresearch.agent import DeepResearchAgent, YieldPublisher
from app.services.deepresearch.prompts import EXTRACTOR_PROMPT, SYSTEM_PROMPT
from app.services.deepresearch.stream import (
    RedisStreamListener,
    RedisStreamPublisher,
    format_sse_event,
)
from app.services.deepresearch.tools import TOOL_MAP

# Import tasks module to ensure Celery autodiscover works
try:
    from app.services.deepresearch import tasks  # noqa: F401
except ImportError:
    pass  # Tasks may not be available in all contexts

__all__ = [
    "DeepResearchAgent",
    "YieldPublisher",
    "RedisStreamPublisher",
    "RedisStreamListener",
    "format_sse_event",
    "SYSTEM_PROMPT",
    "EXTRACTOR_PROMPT",
    "TOOL_MAP",
]
