"""
DeepResearch Multi-Turn ReAct Agent.
Migrated from DeepResearch/inference/react_agent.py and adapted for Thero AI stack.
Updated for SOTA with Chain of Thought (CoT) reasoning and planning phase.

Supports two streaming modes:
1. Direct yield (for single-process streaming via SSE)
2. Redis Pub/Sub (for distributed worker-based streaming)
"""

import asyncio
import json
import os
import random
import re
import time
from datetime import date, datetime
from typing import (
    Any,
    AsyncGenerator,
    Dict,
    List,
    Optional,
    Protocol,
)

import json5
from langchain.chat_models.base import BaseChatModel
from langchain_core.messages import HumanMessage
from openai import APIConnectionError, APIError, APITimeoutError, OpenAI

from app.services.deepresearch.prompts import PLANNING_PROMPT, SYSTEM_PROMPT
from app.services.deepresearch.tools import TOOL_MAP
from app.utils.aimodels import ModelType
from app.utils.llm import get_llm
from libs.core.config import ConfigurationService
from libs.core.logging import create_logger

OBS_START = "<tool_response>"
OBS_END = "\n</tool_response>"

MAX_LLM_CALL_PER_RUN = int(os.getenv("MAX_LLM_CALL_PER_RUN", 100))


class EventPublisher(Protocol):
    """Protocol for event publishers (Redis or direct yield)."""

    async def publish(
        self,
        event_type: str,
        step: str,
        message: Optional[str] = None,
        **extra: Any,
    ) -> None:
        """Publish an event."""
        ...


def _utc_timestamp() -> str:
    """Return an ISO 8601 UTC timestamp."""
    return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"


def _build_sse_event(event_type: str, step: str, message: Optional[str] = None, **extra: Any) -> Dict[str, Any]:
    """Build a structured SSE event payload."""
    payload: Dict[str, Any] = {
        "timestamp": _utc_timestamp(),
        "step": step,
    }
    if message:
        payload["message"] = message
    for key, value in extra.items():
        if value is not None:
            payload[key] = value
    return {"event": event_type, "data": payload}


def _extract_sources_from_messages(messages: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Extract unique web sources from tool responses in the conversation.
    Returns a list of UsedSource objects with id, url, title, domain, snippet.
    Prioritizes URLs from visit tool calls as these are the actually visited pages.
    """
    sources: List[Dict[str, Any]] = []
    seen_urls: set = set()
    source_id = 1

    # First pass: Extract URLs from visit tool calls (these are the primary sources)
    for msg in messages:
        content = msg.get("content", "")
        role = msg.get("role", "")

        # Look for visit tool calls in assistant messages
        if role == "assistant" and '"name": "visit"' in content or '"name":"visit"' in content:
            # Extract URLs from the visit tool arguments
            url_pattern = r'"url"\s*:\s*\[([^\]]+)\]'
            match = re.search(url_pattern, content)
            if match:
                urls_str = match.group(1)
                # Extract individual URLs from the array
                url_matches = re.findall(r'"(https?://[^"]+)"', urls_str)
                for url in url_matches:
                    if url not in seen_urls and len(url) < 500:
                        seen_urls.add(url)
                        try:
                            from urllib.parse import urlparse
                            parsed = urlparse(url)
                            domain = parsed.netloc
                        except Exception:
                            domain = url.split("/")[2] if len(url.split("/")) > 2 else url

                        sources.append({
                            "id": source_id,
                            "url": url,
                            "title": domain,  # Will be enriched later if possible
                            "domain": domain,
                            "snippet": "",
                        })
                        source_id += 1

    # Second pass: Extract any additional URLs from tool responses (fallback)
    for msg in messages:
        content = msg.get("content", "")
        if "<tool_response>" in content or msg.get("role") == "user":
            url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
            urls = re.findall(url_pattern, content)
            for url in urls:
                # Clean URL (remove trailing punctuation)
                url = re.sub(r'[.,;:!?\)\]]+$', '', url)
                if url not in seen_urls and len(url) < 500:
                    seen_urls.add(url)
                    try:
                        from urllib.parse import urlparse
                        parsed = urlparse(url)
                        domain = parsed.netloc
                    except Exception:
                        domain = url.split("/")[2] if len(url.split("/")) > 2 else url

                    sources.append({
                        "id": source_id,
                        "url": url,
                        "title": domain,
                        "domain": domain,
                        "snippet": "",
                    })
                    source_id += 1

    return sources


def _has_inline_citations(answer: str) -> bool:
    """Check if the answer contains inline citations like [1], [2], etc."""
    citation_pattern = r'\[\d+\]'
    return bool(re.search(citation_pattern, answer))


def _add_inline_citations_to_answer(answer: str, sources: List[Dict[str, Any]]) -> str:
    """
    Try to add inline citations to an answer that's missing them.

    This is a fallback mechanism when the LLM doesn't include citations.
    It adds citations at the end of sentences/paragraphs based on source domains found.

    Args:
        answer: The answer text without inline citations
        sources: List of sources with id, url, domain

    Returns:
        Answer with inline citations added where possible
    """
    if not sources or _has_inline_citations(answer):
        return answer

    # Build a mapping of domain keywords to source IDs
    domain_to_id: Dict[str, int] = {}
    for source in sources:
        source_id = source.get("id", 0)
        domain = source.get("domain", "").lower()
        # Extract main domain name (e.g., "wikipedia" from "en.wikipedia.org")
        parts = domain.replace("www.", "").split(".")
        if len(parts) >= 2:
            main_domain = parts[-2] if parts[-1] in ("com", "org", "net", "de", "io", "co") else parts[0]
            domain_to_id[main_domain.lower()] = source_id
        domain_to_id[domain] = source_id

    # If we have sources, add a general citation approach:
    # Add citations at the end of paragraphs or after key sentences
    paragraphs = answer.split("\n\n")
    cited_paragraphs = []

    for i, para in enumerate(paragraphs):
        if not para.strip():
            cited_paragraphs.append(para)
            continue

        # Check if paragraph already ends with a citation
        if re.search(r'\[\d+\]\s*$', para.strip()):
            cited_paragraphs.append(para)
            continue

        # For paragraphs with factual content, add citations
        # We'll distribute citations across paragraphs based on source order
        if len(sources) > 0:
            # Assign citations based on paragraph position
            source_indices = []
            for j, source in enumerate(sources):
                # Check if any domain keyword appears in the paragraph
                domain = source.get("domain", "").lower()
                main_parts = domain.replace("www.", "").split(".")
                for part in main_parts:
                    if len(part) > 3 and part.lower() in para.lower():
                        source_indices.append(source.get("id", j + 1))
                        break

            # If we found matching sources, add their citations
            if source_indices:
                citations = "".join(f"[{idx}]" for idx in sorted(set(source_indices)))
                # Add citation before the last period if exists, else at end
                para = para.rstrip()
                if para.endswith("."):
                    para = para[:-1] + f" {citations}."
                elif para.endswith(":"):
                    para = para[:-1] + f" {citations}:"
                else:
                    para = para + f" {citations}"
            elif i < len(sources):
                # Fallback: assign citation based on paragraph order
                citation_id = sources[min(i, len(sources) - 1)].get("id", i + 1)
                para = para.rstrip()
                if para.endswith("."):
                    para = para[:-1] + f" [{citation_id}]."
                else:
                    para = para + f" [{citation_id}]"

        cited_paragraphs.append(para)

    return "\n\n".join(cited_paragraphs)


def _format_answer_with_references(answer: str, sources: List[Dict[str, Any]]) -> str:
    """
    Format the answer with inline citations and a references section at the bottom.

    This function:
    1. Checks if inline citations [1], [2] exist in the answer
    2. If missing, attempts to add them based on source context
    3. Appends a formatted references section at the bottom

    Args:
        answer: The raw answer text (may or may not contain inline citations)
        sources: List of sources with id, url, title, domain

    Returns:
        Answer with inline citations and a references section appended
    """
    if not sources:
        return answer

    # Check if answer already has a references section
    if "## References" in answer or "## Quellen" in answer or "## Sources" in answer:
        return answer

    # Step 1: Ensure inline citations exist
    if not _has_inline_citations(answer):
        answer = _add_inline_citations_to_answer(answer, sources)

    # Step 2: Build references section
    references_section = "\n\n---\n\n## References\n\n"
    for source in sources:
        source_id = source.get("id", 0)
        url = source.get("url", "")
        domain = source.get("domain", "")
        title = source.get("title", domain)

        # Format: [1] Domain - URL
        if title and title != domain:
            references_section += f"[{source_id}] **{title}** ({domain}): {url}\n\n"
        else:
            references_section += f"[{source_id}] **{domain}**: {url}\n\n"

    return answer + references_section


def today_date() -> str:
    return date.today().strftime("%Y-%m-%d")


class YieldPublisher:
    """
    Adapter that collects events for yield-based streaming.

    Used when running the agent in direct mode (not via Celery workers).
    """

    def __init__(self):
        self.events: List[Dict[str, Any]] = []

    async def publish(
        self,
        event_type: str,
        step: str,
        message: Optional[str] = None,
        **extra: Any,
    ) -> None:
        """Collect event for later yielding."""
        event = _build_sse_event(event_type, step, message, **extra)
        self.events.append(event)

    def pop_events(self) -> List[Dict[str, Any]]:
        """Return and clear collected events."""
        events = self.events
        self.events = []
        return events


class DeepResearchAgent:
    """
    Multi-turn ReAct agent for deep research tasks.

    Uses an LLM (via OpenAI-compatible API) to conduct research by:
    - Searching the web
    - Visiting and extracting content from pages
    - Executing Python code
    - Parsing files

    SOTA Features:
    - Chain of Thought (CoT) reasoning with <think> tags
    - Planning phase before research begins
    - SLM-based content extraction for webpage visits
    """

    def __init__(
        self,
        api_base: str,
        api_key: str = "EMPTY",
        model: str = "alibaba/tongyi-deepresearch-30b-a3b",
        temperature: float = 0.6,
        top_p: float = 0.95,
        presence_penalty: float = 1.1,
        max_tokens: int = 10000,
        timeout: float = 600.0,
        logger=None,
        config_service: Optional[ConfigurationService] = None,
    ):
        self.api_base = api_base
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.top_p = top_p
        self.presence_penalty = presence_penalty
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.logger = logger or create_logger("deepresearch_agent")
        self.config_service = config_service

        self._client: Optional[OpenAI] = None
        self._slm_client: Optional[BaseChatModel] = None
        self._slm_initialized: bool = False

    def _get_client(self) -> OpenAI:
        """Get or create the OpenAI client."""
        if self._client is None:
            self._client = OpenAI(
                api_key=self.api_key,
                base_url=self.api_base,
                timeout=self.timeout,
            )
        return self._client

    async def _initialize_slm(self) -> None:
        """
        Initialize the SLM client for content extraction and planning.

        Uses the configured SLM model from the system's AI model configuration.
        Falls back gracefully if SLM is not configured.
        """
        if self._slm_initialized:
            return

        self._slm_initialized = True

        if self.config_service is None:
            self.logger.warning(
                "No config_service provided - SLM features disabled. "
                "Visit tool will use simple truncation instead of intelligent extraction."
            )
            return

        try:
            self._slm_client, slm_config = await get_llm(
                self.config_service,
                model_type=ModelType.SLM.value,
            )
            self.logger.info(
                f"SLM initialized for content extraction: {slm_config.get('modelKey', 'unknown')}"
            )

            # Inject SLM client into the visit tool
            if "visit" in TOOL_MAP:
                TOOL_MAP["visit"].set_slm_client(self._slm_client)
                self.logger.debug("SLM client injected into VisitTool")

        except Exception as e:
            self.logger.warning(
                f"Failed to initialize SLM: {e}. "
                "Visit tool will use simple truncation instead of intelligent extraction."
            )
            self._slm_client = None

    async def generate_plan(self, question: str) -> List[str]:
        """
        Generate a research plan by breaking down the question into sub-questions.

        Uses the SLM for fast planning to create 3-5 distinct search dimensions.
        Falls back to the main LLM if SLM is unavailable.

        Args:
            question: The main research question

        Returns:
            List of sub-questions/search dimensions
        """
        planning_prompt = PLANNING_PROMPT.format(question=question)

        try:
            # Try using SLM first (faster and cheaper)
            if self._slm_client is not None:
                self.logger.debug("Using SLM for research planning")
                response = await self._slm_client.ainvoke([HumanMessage(content=planning_prompt)])
                response_text = response.content if hasattr(response, 'content') else str(response)
            else:
                # Fall back to main LLM
                self.logger.debug("Using main LLM for research planning (SLM unavailable)")
                messages = [{"role": "user", "content": planning_prompt}]
                response_text = self.call_llm(messages, max_tries=3)

            # Parse the JSON array response
            # Handle potential markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()

            sub_questions = json5.loads(response_text)

            if isinstance(sub_questions, list) and len(sub_questions) > 0:
                self.logger.info(f"Generated research plan with {len(sub_questions)} sub-questions")
                return sub_questions
            else:
                self.logger.warning("Planning returned invalid format, using original question")
                return [question]

        except Exception as e:
            self.logger.error(f"Failed to generate research plan: {e}")
            # Fall back to using the original question as the only "sub-question"
            return [question]

    def call_llm(self, messages: List[Dict[str, str]], max_tries: int = 10) -> str:
        """
        Call the LLM with retry logic.

        Args:
            messages: List of message dicts with 'role' and 'content'
            max_tries: Maximum number of retry attempts

        Returns:
            The assistant's response content
        """
        client = self._get_client()
        base_sleep_time = 1

        for attempt in range(max_tries):
            try:
                self.logger.debug(f"LLM call attempt {attempt + 1}/{max_tries}")

                response = client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    stop=["\n<tool_response>", "<tool_response>"],
                    temperature=self.temperature,
                    top_p=self.top_p,
                    max_tokens=self.max_tokens,
                    presence_penalty=self.presence_penalty,
                )

                content = response.choices[0].message.content

                if content and content.strip():
                    self.logger.debug("LLM call successful")
                    return content.strip()
                else:
                    self.logger.warning(f"Attempt {attempt + 1} received empty response")

            except (APIError, APIConnectionError, APITimeoutError) as e:
                self.logger.error(f"Attempt {attempt + 1} failed with API error: {e}")
            except Exception as e:
                self.logger.error(f"Attempt {attempt + 1} failed with unexpected error: {e}")

            if attempt < max_tries - 1:
                sleep_time = base_sleep_time * (2 ** attempt) + random.uniform(0, 1)
                sleep_time = min(sleep_time, 30)
                self.logger.debug(f"Retrying in {sleep_time:.2f} seconds...")
                time.sleep(sleep_time)
            else:
                self.logger.error("All retry attempts exhausted")

        return "LLM server error - all retries failed"

    async def call_tool(self, tool_name: str, tool_args: Dict[str, Any]) -> str:
        """
        Call a tool by name with the given arguments.

        Args:
            tool_name: Name of the tool to call
            tool_args: Arguments to pass to the tool

        Returns:
            Tool execution result as string
        """
        if tool_name not in TOOL_MAP:
            return f"Error: Tool '{tool_name}' not found"

        tool = TOOL_MAP[tool_name]

        try:
            if tool_name == "PythonInterpreter":
                # Python interpreter receives raw code
                result = await tool.call(tool_args)
            elif tool_name == "parse_file":
                params = {"files": tool_args.get("files", [])}
                result = await tool.call(params)
            else:
                result = await tool.call(tool_args)

            if not isinstance(result, str):
                result = str(result)

            return result

        except Exception as e:
            self.logger.error(f"Tool '{tool_name}' execution failed: {e}")
            return f"Error executing tool '{tool_name}': {e}"

    async def run(
        self,
        question: str,
        *,
        max_rounds: Optional[int] = None,
        max_time_minutes: int = 150,
        max_context_tokens: int = 110 * 1024,
        enable_planning: bool = True,
        research_plan: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Run the research agent on a question.

        Args:
            question: The research question to answer
            max_rounds: Maximum number of LLM call rounds (defaults to MAX_LLM_CALL_PER_RUN)
            max_time_minutes: Maximum execution time in minutes
            max_context_tokens: Maximum context tokens before forcing an answer
            enable_planning: Whether to generate a research plan before starting
            research_plan: Pre-defined research plan steps (from SLM planning, optionally refined by user)

        Returns:
            Dict with question, messages, prediction, and termination reason
        """
        max_rounds = max_rounds or MAX_LLM_CALL_PER_RUN
        start_time = time.time()

        # Initialize SLM for content extraction (if not already done)
        await self._initialize_slm()

        # 1. PLANNING PHASE (SOTA Feature)
        # Use pre-defined plan if provided, otherwise generate a new one
        if research_plan:
            self.logger.info(f"Using pre-defined research plan with {len(research_plan)} steps")
        elif enable_planning:
            self.logger.info("Starting planning phase...")
            research_plan = await self.generate_plan(question)
        else:
            research_plan = []

        # 2. BUILD INITIAL CONTEXT
        system_prompt = SYSTEM_PROMPT + today_date()

        # Inject the research plan into the user context
        if research_plan and len(research_plan) > 1:
            plan_text = "\n".join(f"  {i+1}. {sq}" for i, sq in enumerate(research_plan))
            initial_context = (
                f"**User Question:** {question}\n\n"
                f"**Research Plan:**\n"
                f"I have broken down this question into the following sub-questions to investigate:\n"
                f"{plan_text}\n\n"
                f"Begin your research by addressing these sub-questions systematically. "
                f"Use <think> tags to reason through each step."
            )
        else:
            initial_context = question

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": initial_context},
        ]

        round_num = 0
        termination = "unknown"
        prediction = ""

        while round_num < max_rounds:
            # Check time limit
            elapsed_minutes = (time.time() - start_time) / 60
            if elapsed_minutes > max_time_minutes:
                termination = f"Time limit reached ({max_time_minutes} minutes)"
                prediction = "No answer found - time limit reached"
                break

            round_num += 1
            self.logger.info(f"Round {round_num}/{max_rounds}")

            # Call LLM
            content = self.call_llm(messages)

            # Clean up response
            if "<tool_response>" in content:
                content = content.split("<tool_response>")[0]

            messages.append({"role": "assistant", "content": content.strip()})

            # Check for tool calls
            if "<tool_call>" in content and "</tool_call>" in content:
                tool_call_str = content.split("<tool_call>")[1].split("</tool_call>")[0]

                try:
                    # Handle Python interpreter special case
                    if "python" in tool_call_str.lower() and "<code>" in content:
                        code = content.split("<code>")[1].split("</code>")[0].strip()
                        result = await self.call_tool("PythonInterpreter", {"code": code})
                    else:
                        tool_call = json5.loads(tool_call_str)
                        tool_name = tool_call.get("name", "")
                        tool_args = tool_call.get("arguments", {})
                        result = await self.call_tool(tool_name, tool_args)

                except json.JSONDecodeError:
                    result = "Error: Tool call is not valid JSON. Must contain 'name' and 'arguments' fields."
                except Exception as e:
                    result = f"Error processing tool call: {e}"

                # Add tool response
                tool_response = f"<tool_response>\n{result}\n</tool_response>"
                messages.append({"role": "user", "content": tool_response})

            # Check for final answer
            if "<answer>" in content and "</answer>" in content:
                prediction = content.split("<answer>")[1].split("</answer>")[0]
                termination = "answer"
                break

            # Check context length (simplified - actual token counting would need tokenizer)
            total_chars = sum(len(m["content"]) for m in messages)
            estimated_tokens = total_chars // 4  # Rough estimate

            if estimated_tokens > max_context_tokens:
                self.logger.warning(f"Context limit approaching: ~{estimated_tokens} tokens")

                # Force final answer
                force_answer_msg = (
                    "You have reached the maximum context length. Stop making tool calls and, "
                    "based on all the information above, provide your best answer in the format: "
                    "<think>your final thinking</think>\n<answer>your answer</answer>\n\n"
                    "IMPORTANT: Include inline citations [1], [2], etc. for all facts from your research."
                )
                messages.append({"role": "user", "content": force_answer_msg})

                content = self.call_llm(messages)
                messages.append({"role": "assistant", "content": content.strip()})

                if "<answer>" in content and "</answer>" in content:
                    prediction = content.split("<answer>")[1].split("</answer>")[0]
                    termination = "answer (context limit)"
                else:
                    prediction = content
                    termination = "context limit (format error)"
                break

        if round_num >= max_rounds and not prediction:
            termination = "max rounds exceeded"
            prediction = "No answer found - maximum rounds exceeded"

        # Extract sources and format answer with references
        sources = _extract_sources_from_messages(messages)
        if sources and prediction:
            prediction = _format_answer_with_references(prediction, sources)

        return {
            "question": question,
            "messages": messages,
            "prediction": prediction,
            "termination": termination,
            "rounds": round_num,
            "elapsed_seconds": time.time() - start_time,
            "research_plan": research_plan,
            "sources": sources,
        }

    async def run_stream(
        self,
        question: str,
        *,
        max_rounds: Optional[int] = None,
        max_time_minutes: int = 150,
        max_context_tokens: int = 110 * 1024,
        enable_planning: bool = True,
        research_plan: Optional[List[str]] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run the research agent on a question with streaming events.

        Yields structured SSE events during the research process:
        - status: General status updates
        - plan: Research plan with sub-questions
        - thinking_chunk/thinking_complete: Chain of Thought reasoning
        - tool_call/tool_result: Tool usage updates
        - search/visit: Web search and page visit progress
        - answer_chunk: Streaming answer content
        - complete: Final response with all data

        Args:
            question: The research question to answer
            max_rounds: Maximum number of LLM call rounds
            max_time_minutes: Maximum execution time in minutes
            max_context_tokens: Maximum context tokens before forcing an answer
            enable_planning: Whether to generate a research plan before starting
            research_plan: Pre-defined research plan steps (from SLM planning, optionally refined by user)

        Yields:
            Dict with event type and data payload
        """
        max_rounds = max_rounds or MAX_LLM_CALL_PER_RUN
        start_time = time.time()

        # Emit start event
        yield _build_sse_event("status", "started", "Starting deep research...")

        # Initialize SLM for content extraction
        await self._initialize_slm()
        yield _build_sse_event("status", "initialized", "Research agent initialized")

        # 1. PLANNING PHASE
        # Use pre-defined plan if provided, otherwise generate a new one
        if research_plan:
            self.logger.info(f"Using pre-defined research plan with {len(research_plan)} steps")
            yield _build_sse_event(
                "plan",
                "plan_provided",
                f"Using pre-defined research plan with {len(research_plan)} steps",
                subQuestions=research_plan,
                questionCount=len(research_plan),
            )
        elif enable_planning:
            yield _build_sse_event("status", "planning", "Analyzing question and creating research plan...")
            self.logger.info("Starting planning phase...")
            research_plan = await self.generate_plan(question)

            # Emit plan event
            yield _build_sse_event(
                "plan",
                "plan_created",
                f"Created research plan with {len(research_plan)} sub-questions",
                subQuestions=research_plan,
                questionCount=len(research_plan),
            )
        else:
            research_plan = []

        # 2. BUILD INITIAL CONTEXT
        system_prompt = SYSTEM_PROMPT + today_date()

        if research_plan and len(research_plan) > 1:
            plan_text = "\n".join(f"  {i+1}. {sq}" for i, sq in enumerate(research_plan))
            initial_context = (
                f"**User Question:** {question}\n\n"
                f"**Research Plan:**\n"
                f"I have broken down this question into the following sub-questions to investigate:\n"
                f"{plan_text}\n\n"
                f"Begin your research by addressing these sub-questions systematically. "
                f"Use <think> tags to reason through each step."
            )
        else:
            initial_context = question

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": initial_context},
        ]

        round_num = 0
        termination = "unknown"
        prediction = ""
        accumulated_thinking = ""

        while round_num < max_rounds:
            # Check time limit
            elapsed_minutes = (time.time() - start_time) / 60
            if elapsed_minutes > max_time_minutes:
                termination = f"Time limit reached ({max_time_minutes} minutes)"
                prediction = "No answer found - time limit reached"
                yield _build_sse_event("status", "timeout", termination)
                break

            round_num += 1
            self.logger.info(f"Round {round_num}/{max_rounds}")

            yield _build_sse_event(
                "status",
                "reasoning",
                f"Research round {round_num}/{max_rounds}...",
                round=round_num,
                maxRounds=max_rounds,
            )

            # Call LLM
            content = self.call_llm(messages)

            # Clean up response
            if "<tool_response>" in content:
                content = content.split("<tool_response>")[0]

            messages.append({"role": "assistant", "content": content.strip()})

            # Extract and emit thinking content
            if "<think>" in content:
                think_match = re.search(r"<think>(.*?)</think>", content, re.DOTALL)
                if think_match:
                    thinking_content = think_match.group(1).strip()
                    accumulated_thinking += thinking_content + "\n\n"
                    yield _build_sse_event(
                        "thinking_chunk",
                        "thinking",
                        thinking_content[:200] + "..." if len(thinking_content) > 200 else thinking_content,
                        chunk=thinking_content,
                    )

            # Check for tool calls
            if "<tool_call>" in content and "</tool_call>" in content:
                tool_call_str = content.split("<tool_call>")[1].split("</tool_call>")[0]

                try:
                    # Handle Python interpreter special case
                    if "python" in tool_call_str.lower() and "<code>" in content:
                        code = content.split("<code>")[1].split("</code>")[0].strip()
                        tool_name = "PythonInterpreter"
                        tool_args = {"code": code}

                        yield _build_sse_event(
                            "tool_call",
                            "tool_call",
                            "Executing Python code...",
                            toolName=tool_name,
                            toolArgs={"code": code[:100] + "..." if len(code) > 100 else code},
                        )

                        result = await self.call_tool(tool_name, tool_args)
                    else:
                        tool_call = json5.loads(tool_call_str)
                        tool_name = tool_call.get("name", "")
                        tool_args = tool_call.get("arguments", {})

                        # Emit appropriate event based on tool type
                        if tool_name == "search":
                            queries = tool_args.get("query", [])
                            yield _build_sse_event(
                                "web_search",
                                "searching",
                                f"Searching: {queries[0] if queries else 'web'}...",
                                queries=queries,
                            )
                        elif tool_name == "visit":
                            urls = tool_args.get("url", [])
                            yield _build_sse_event(
                                "status",
                                "visiting",
                                f"Reading: {urls[0] if urls else 'page'}...",
                                urls=urls,
                                goal=tool_args.get("goal", ""),
                            )
                        elif tool_name == "google_scholar":
                            queries = tool_args.get("query", [])
                            yield _build_sse_event(
                                "web_search",
                                "scholar_search",
                                f"Searching academic sources: {queries[0] if queries else ''}...",
                                queries=queries,
                            )
                        else:
                            yield _build_sse_event(
                                "tool_call",
                                "tool_call",
                                f"Using tool: {tool_name}",
                                toolName=tool_name,
                                toolArgs=tool_args,
                            )

                        result = await self.call_tool(tool_name, tool_args)

                    # Emit tool result
                    result_preview = result[:500] + "..." if len(result) > 500 else result
                    yield _build_sse_event(
                        "tool_result",
                        "tool_complete",
                        f"Tool {tool_name} completed",
                        toolName=tool_name,
                        resultPreview=result_preview,
                        resultLength=len(result),
                    )

                except json.JSONDecodeError:
                    result = "Error: Tool call is not valid JSON. Must contain 'name' and 'arguments' fields."
                    yield _build_sse_event("status", "tool_error", result)
                except Exception as e:
                    result = f"Error processing tool call: {e}"
                    yield _build_sse_event("status", "tool_error", result)

                # Add tool response
                tool_response = f"<tool_response>\n{result}\n</tool_response>"
                messages.append({"role": "user", "content": tool_response})

            # Check for final answer
            if "<answer>" in content and "</answer>" in content:
                prediction = content.split("<answer>")[1].split("</answer>")[0]
                termination = "answer"
                break

            # Check context length
            total_chars = sum(len(m["content"]) for m in messages)
            estimated_tokens = total_chars // 4

            if estimated_tokens > max_context_tokens:
                self.logger.warning(f"Context limit approaching: ~{estimated_tokens} tokens")
                yield _build_sse_event("status", "context_limit", "Approaching context limit, finalizing answer...")

                force_answer_msg = (
                    "You have reached the maximum context length. Stop making tool calls and, "
                    "based on all the information above, provide your best answer in the format: "
                    "<think>your final thinking</think>\n<answer>your answer</answer>\n\n"
                    "IMPORTANT: Include inline citations [1], [2], etc. for all facts from your research."
                )
                messages.append({"role": "user", "content": force_answer_msg})

                content = self.call_llm(messages)
                messages.append({"role": "assistant", "content": content.strip()})

                if "<answer>" in content and "</answer>" in content:
                    prediction = content.split("<answer>")[1].split("</answer>")[0]
                    termination = "answer (context limit)"
                else:
                    prediction = content
                    termination = "context limit (format error)"
                break

        if round_num >= max_rounds and not prediction:
            termination = "max rounds exceeded"
            prediction = "No answer found - maximum rounds exceeded"
            yield _build_sse_event("status", "max_rounds", termination)

        # Emit thinking complete if we accumulated any
        if accumulated_thinking:
            yield _build_sse_event(
                "thinking_complete",
                "thinking_done",
                "Reasoning complete",
                thinking=accumulated_thinking.strip(),
            )

        # Extract sources from the conversation
        sources = _extract_sources_from_messages(messages)

        # Format prediction with references section
        if sources and prediction:
            prediction = _format_answer_with_references(prediction, sources)

        # Emit web_results if we have sources
        if sources:
            yield _build_sse_event(
                "web_results",
                "sources_ready",
                f"Found {len(sources)} sources",
                sources=sources,
                totalResults=len(sources),
            )

        # Emit answer chunks (stream the final formatted answer)
        if prediction:
            answer_chunks = [prediction[i:i+100] for i in range(0, len(prediction), 100)]
            for chunk in answer_chunks:
                yield _build_sse_event(
                    "answer_chunk",
                    "answer",
                    None,
                    chunk=chunk,
                )
                await asyncio.sleep(0.01)  # Small delay for streaming effect

        # Emit complete event with full response
        elapsed_seconds = time.time() - start_time
        yield _build_sse_event(
            "complete",
            "complete",
            "Deep research completed",
            answer=prediction,
            termination=termination,
            rounds=round_num,
            elapsedSeconds=elapsed_seconds,
            researchPlan=research_plan,
            sources=sources,
            thinking=accumulated_thinking.strip() if accumulated_thinking else None,
        )

    async def run_subtask(
        self,
        sub_question: str,
        context: str = "",
        *,
        subtask_id: str = "",
        max_rounds: Optional[int] = None,
        max_time_minutes: int = 30,
        max_context_tokens: int = 50 * 1024,
        publisher: Optional[EventPublisher] = None,
    ) -> Dict[str, Any]:
        """
        Run a focused research task on a single sub-question.

        This is designed for parallel execution via Celery workers.
        Each sub-task investigates one aspect of the main question.

        Args:
            sub_question: The specific sub-question to investigate
            context: Additional context from the main question
            subtask_id: Unique identifier for this subtask
            max_rounds: Maximum LLM call rounds (lower than full research)
            max_time_minutes: Time limit per subtask
            max_context_tokens: Context limit per subtask
            publisher: Optional event publisher for streaming updates

        Returns:
            Dict with findings, sources, and metadata
        """
        max_rounds = max_rounds or min(MAX_LLM_CALL_PER_RUN, 30)  # Subtasks are more focused
        start_time = time.time()

        # Initialize SLM if needed
        await self._initialize_slm()

        if publisher:
            await publisher.publish(
                "subtask_progress",
                "subtask_started",
                f"Starting research on: {sub_question[:50]}...",
                subtaskId=subtask_id,
                subQuestion=sub_question,
            )

        # Build focused context for this subtask
        system_prompt = SYSTEM_PROMPT + today_date()

        if context:
            initial_context = (
                f"**Main Research Context:** {context}\n\n"
                f"**Your Specific Task:** {sub_question}\n\n"
                f"Focus your research specifically on answering this sub-question. "
                f"Be thorough but focused. Use <think> tags to reason through each step."
            )
        else:
            initial_context = sub_question

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": initial_context},
        ]

        round_num = 0
        termination = "unknown"
        findings = ""
        accumulated_thinking = ""

        while round_num < max_rounds:
            # Check time limit
            elapsed_minutes = (time.time() - start_time) / 60
            if elapsed_minutes > max_time_minutes:
                termination = "subtask_timeout"
                findings = "Research on this sub-question timed out."
                break

            round_num += 1
            self.logger.info(f"[{subtask_id}] Subtask round {round_num}/{max_rounds}")

            if publisher:
                await publisher.publish(
                    "subtask_progress",
                    "subtask_reasoning",
                    f"Research round {round_num}/{max_rounds}...",
                    subtaskId=subtask_id,
                    round=round_num,
                    maxRounds=max_rounds,
                )

            # Call LLM
            content = self.call_llm(messages)

            # Clean up response
            if "<tool_response>" in content:
                content = content.split("<tool_response>")[0]

            messages.append({"role": "assistant", "content": content.strip()})

            # Extract thinking
            if "<think>" in content:
                think_match = re.search(r"<think>(.*?)</think>", content, re.DOTALL)
                if think_match:
                    thinking_content = think_match.group(1).strip()
                    accumulated_thinking += thinking_content + "\n\n"

            # Check for tool calls
            if "<tool_call>" in content and "</tool_call>" in content:
                tool_call_str = content.split("<tool_call>")[1].split("</tool_call>")[0]

                try:
                    if "python" in tool_call_str.lower() and "<code>" in content:
                        code = content.split("<code>")[1].split("</code>")[0].strip()
                        result = await self.call_tool("PythonInterpreter", {"code": code})
                    else:
                        tool_call = json5.loads(tool_call_str)
                        tool_name = tool_call.get("name", "")
                        tool_args = tool_call.get("arguments", {})

                        if publisher and tool_name in ("search", "visit", "google_scholar"):
                            await publisher.publish(
                                "subtask_progress",
                                f"subtask_{tool_name}",
                                f"Using {tool_name}...",
                                subtaskId=subtask_id,
                                toolName=tool_name,
                            )

                        result = await self.call_tool(tool_name, tool_args)

                except json.JSONDecodeError:
                    result = "Error: Tool call is not valid JSON."
                except Exception as e:
                    result = f"Error processing tool call: {e}"

                tool_response = f"<tool_response>\n{result}\n</tool_response>"
                messages.append({"role": "user", "content": tool_response})

            # Check for findings/answer
            if "<answer>" in content and "</answer>" in content:
                findings = content.split("<answer>")[1].split("</answer>")[0]
                termination = "findings_complete"
                break

            # Check context length
            total_chars = sum(len(m["content"]) for m in messages)
            estimated_tokens = total_chars // 4

            if estimated_tokens > max_context_tokens:
                self.logger.warning(f"[{subtask_id}] Subtask context limit reached")

                force_answer_msg = (
                    "Summarize your findings for this sub-question now. "
                    "Provide your findings in the format: "
                    "<think>your summary thinking</think>\n<answer>your findings</answer>"
                )
                messages.append({"role": "user", "content": force_answer_msg})

                content = self.call_llm(messages)
                messages.append({"role": "assistant", "content": content.strip()})

                if "<answer>" in content and "</answer>" in content:
                    findings = content.split("<answer>")[1].split("</answer>")[0]
                    termination = "findings_complete (context limit)"
                else:
                    findings = content
                    termination = "context limit"
                break

        if round_num >= max_rounds and not findings:
            termination = "max_rounds"
            # Try to extract any useful content from last response
            findings = "Maximum rounds reached without complete findings."

        # Extract sources
        sources = _extract_sources_from_messages(messages)

        elapsed_seconds = time.time() - start_time

        if publisher:
            await publisher.publish(
                "subtask_completed",
                "subtask_done",
                "Completed research on sub-question",
                subtaskId=subtask_id,
                subQuestion=sub_question,
                findingsPreview=findings[:200] if findings else "",
            )

        return {
            "subtask_id": subtask_id,
            "sub_question": sub_question,
            "findings": findings,
            "thinking": accumulated_thinking.strip(),
            "sources": sources,
            "termination": termination,
            "rounds": round_num,
            "elapsed_seconds": elapsed_seconds,
            "messages": messages,
        }

    async def synthesize_findings(
        self,
        original_question: str,
        subtask_results: List[Dict[str, Any]],
        research_plan: List[str],
        *,
        publisher: Optional[EventPublisher] = None,
    ) -> Dict[str, Any]:
        """
        Synthesize findings from multiple subtask results into a final answer.

        Args:
            original_question: The original research question
            subtask_results: List of results from run_subtask calls
            research_plan: The original research plan
            publisher: Optional event publisher for streaming updates

        Returns:
            Dict with final answer and metadata
        """
        start_time = time.time()

        if publisher:
            await publisher.publish(
                "status",
                "synthesis_started",
                "Synthesizing findings from all research tasks...",
            )

        # Build synthesis prompt
        findings_text = ""
        all_sources = []
        total_rounds = 0

        for i, result in enumerate(subtask_results):
            sub_q = result.get("sub_question", f"Sub-question {i+1}")
            findings = result.get("findings", "No findings available.")
            findings_text += f"\n### {i+1}. {sub_q}\n{findings}\n"

            # Collect sources
            sources = result.get("sources", [])
            for source in sources:
                if source not in all_sources:
                    all_sources.append(source)

            total_rounds += result.get("rounds", 0)

        # Build source list for reference in the prompt
        source_list = ""
        for idx, src in enumerate(all_sources, 1):
            url = src.get("url", "")
            domain = src.get("domain", "")
            source_list += f"  [{idx}] {domain}: {url}\n"

        synthesis_prompt = f"""You are synthesizing research findings into a comprehensive answer.

**Original Question:** {original_question}

**Research Plan:**
{chr(10).join(f"  {i+1}. {sq}" for i, sq in enumerate(research_plan))}

**Available Sources (use these for citations):**
{source_list}

**Findings from Research:**
{findings_text}

**ABSOLUTELY CRITICAL - INLINE CITATIONS:**
You MUST include inline citations [1], [2], [3] etc. DIRECTLY IN YOUR ANSWER TEXT!

Example of CORRECT format:
"Tesla was founded in 2003 [1]. The company launched its first vehicle in 2008 [2]. Revenue grew by 25% in 2023 [1][3]."

Example of WRONG format (DO NOT DO THIS):
"Tesla was founded in 2003. The company launched its first vehicle in 2008."
(This is wrong because it has NO inline citations!)

**Instructions:**
1. Synthesize all findings into a coherent, comprehensive answer
2. Address the original question directly
3. EVERY factual sentence MUST end with a citation like [1] or [2][3]
4. Note any gaps or areas where findings were incomplete

Respond with:
<think>Your synthesis reasoning</think>
<answer>Your comprehensive answer with [1], [2], etc. inline citations after EVERY fact</answer>
"""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + today_date()},
            {"role": "user", "content": synthesis_prompt},
        ]

        # Call LLM for synthesis
        content = self.call_llm(messages, max_tries=5)

        # Extract answer
        if "<answer>" in content and "</answer>" in content:
            final_answer = content.split("<answer>")[1].split("</answer>")[0]
            termination = "synthesized"
        else:
            final_answer = content
            termination = "synthesis_format_error"

        # Extract thinking
        accumulated_thinking = ""
        if "<think>" in content:
            think_match = re.search(r"<think>(.*?)</think>", content, re.DOTALL)
            if think_match:
                accumulated_thinking = think_match.group(1).strip()

        elapsed_seconds = time.time() - start_time

        if publisher:
            await publisher.publish(
                "status",
                "synthesis_complete",
                "Synthesis complete",
            )

        # Format answer with references section
        if all_sources and final_answer:
            final_answer = _format_answer_with_references(final_answer, all_sources)

        return {
            "question": original_question,
            "prediction": final_answer,
            "termination": termination,
            "rounds": total_rounds,
            "elapsed_seconds": elapsed_seconds,
            "research_plan": research_plan,
            "sources": all_sources,
            "thinking": accumulated_thinking,
            "subtask_count": len(subtask_results),
        }
