"""
Deep Research Helper Module

This module encapsulates all Deep Research functionality including:
- Query analysis and research planning
- Confidence scoring and gap analysis
- Streaming research execution
"""

import json
import logging
import os
from datetime import datetime
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

import httpx
from pydantic import BaseModel

from libs.core.config import ConfigurationService

logger = logging.getLogger(__name__)


# Deep Research Service Configuration
DEEPRESEARCH_SERVICE_URL = os.getenv(
    "DEEPRESEARCH_SERVICE_URL", "http://localhost:8090"
).rstrip("/")

class DeepResearchQuery(BaseModel):
    """Query model for Deep Research requests."""
    query: str
    isClarificationResponse: Optional[bool] = False
    originalQuery: Optional[str] = None
    isPlanConfirmation: Optional[bool] = False
    confirmedPlan: Optional[List[str]] = None
    confirmedAssumptions: Optional[List[str]] = None


class DeepResearchHelper:
    """
    Helper class for Deep Research operations.

    Handles:
    - Query analysis and research planning
    - Confidence scoring with thresholds
    - Gap analysis (ambiguity, scope, format, intent)
    - Streaming research execution
    """

    def __init__(
        self,
        config_service: ConfigurationService,
        logger: Optional[logging.Logger] = None,
    ):
        self.config_service = config_service
        self.logger = logger or logging.getLogger(__name__)
        self.service_url = DEEPRESEARCH_SERVICE_URL

    @staticmethod
    def _utc_timestamp() -> str:
        """Generate UTC timestamp in ISO format."""
        return datetime.utcnow().isoformat(timespec="milliseconds") + "Z"

    @staticmethod
    def _build_event_payload(
        step: str, message: Optional[str] = None, **extra: Any
    ) -> Dict[str, Any]:
        """Build a standardized event payload."""
        payload: Dict[str, Any] = {
            "timestamp": DeepResearchHelper._utc_timestamp(),
            "step": step,
        }
        if message:
            payload["message"] = message
        for key, value in extra.items():
            if value is not None:
                payload[key] = value
        return payload

    async def analyze_query_and_create_plan(self, query: str) -> Dict[str, Any]:
        """
        Comprehensive query analysis for Deep Research with research plan generation.

        Uses the DeepResearch model (via the /api/v1/research/analyze endpoint) to:
        1. Simulation Phase - Creates a preliminary research plan
        2. Gap Analysis - Identifies missing information (ambiguity, scope, format, intent)
        3. Confidence Scoring - Calculates confidence (0-100) with thresholds:
           - High (90-100%): Proceed immediately
           - Medium (50-89%): Show plan with assumptions, await confirmation
           - Low (0-49%): Ask clarifying questions

        Args:
            query: The user's research query

        Returns:
            Dict containing:
            - confidence_score: int (0-100)
            - confidence_level: str (high/medium/low)
            - research_plan: List[str]
            - identified_gaps: List[Dict] with type, description, impact
            - assumptions: List[str] (for medium confidence)
            - clarifying_questions: List[str] (for low confidence)
            - reasoning: str
            - needs_confirmation: bool (True for medium confidence)
            - needs_clarification: bool (True for low confidence)
        """
        self.logger.debug("=== analyze_query_and_create_plan STARTED ===")
        self.logger.debug(f"Query to analyze: '{query}'")

        try:
            # Call the DeepResearch service's analyze endpoint
            analyze_url = f"{self.service_url}/api/v1/research/analyze"
            payload = {"query": query}

            self.logger.debug(f"Calling DeepResearch analyze endpoint: {analyze_url}")

            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(analyze_url, json=payload)

            if response.status_code != 200:
                error_detail = response.text
                self.logger.error(
                    f"DeepResearch analyze endpoint returned {response.status_code}: {error_detail}"
                )
                raise RuntimeError(f"Analysis failed: {error_detail}")

            result = response.json()
            self.logger.debug(f"Analyze response: {result}")

            # Convert identified_gaps from list of dicts to proper format
            identified_gaps = []
            for gap in result.get("identified_gaps", []):
                if isinstance(gap, dict):
                    identified_gaps.append({
                        "type": gap.get("type", "scope"),
                        "description": gap.get("description", ""),
                        "impact": gap.get("impact", ""),
                    })

            # Build the comprehensive result
            final_result = {
                "confidence_score": result.get("confidence_score", 50),
                "confidence_level": result.get("confidence_level", "medium"),
                "research_plan": result.get("research_plan", []),
                "identified_gaps": identified_gaps,
                "assumptions": result.get("assumptions", []),
                "clarifying_questions": result.get("clarifying_questions", []),
                "reasoning": result.get("reasoning", ""),
                "needs_confirmation": result.get("needs_confirmation", False),
                "needs_clarification": result.get("needs_clarification", False),
                "can_proceed_immediately": result.get("can_proceed_immediately", False),
            }

            self.logger.debug(
                f"Research plan result: confidence={final_result['confidence_score']}% "
                f"({final_result['confidence_level']})"
            )
            self.logger.debug(
                f"Plan steps: {len(final_result['research_plan'])}, "
                f"Gaps: {len(final_result['identified_gaps'])}"
            )
            self.logger.debug(
                f"needs_confirmation={final_result['needs_confirmation']}, "
                f"needs_clarification={final_result['needs_clarification']}"
            )
            self.logger.debug("=== analyze_query_and_create_plan COMPLETED ===")

            return final_result

        except Exception as e:
            self.logger.warning(
                f"Research plan analysis failed: {e}. Proceeding with high confidence fallback."
            )
            self.logger.debug(f"Exception details: {str(e)}")

            # On error, proceed with research (don't block the user)
            return {
                "confidence_score": 100,
                "confidence_level": "high",
                "research_plan": [],
                "identified_gaps": [],
                "assumptions": [],
                "clarifying_questions": [],
                "reasoning": f"Planning analysis skipped due to error: {e}",
                "needs_confirmation": False,
                "needs_clarification": False,
                "can_proceed_immediately": True,
            }

    async def run_research(self, query_text: str) -> Dict[str, Any]:
        """
        Execute DeepResearch via the dedicated service (research_main on port 8090).

        Args:
            query_text: The research query to execute

        Returns:
            Dict containing answer, citations, confidence, reason, and metadata
        """
        self.logger.debug("=== run_research STARTED ===")
        self.logger.debug(f"Query text: '{query_text}'")

        if not query_text or not query_text.strip():
            self.logger.debug("Query text is empty, raising ValueError")
            raise ValueError("DeepResearch query is empty.")

        service_url = f"{self.service_url}/api/v1/research"
        payload = {"question": query_text}

        self.logger.debug(f"Service URL: {service_url}")
        self.logger.debug(f"Payload: {payload}")

        try:
            self.logger.debug("Making HTTP request to DeepResearch service...")
            async with httpx.AsyncClient(timeout=600) as client:
                response = await client.post(service_url, json=payload)
            self.logger.debug(f"HTTP response status: {response.status_code}")
        except Exception as exc:
            self.logger.error(
                "DeepResearch service call failed: %s", exc, exc_info=True
            )
            raise RuntimeError(
                f"DeepResearch service unreachable at {service_url}: {exc}"
            ) from exc

        if response.status_code != 200:
            detail = response.text
            self.logger.error(
                "DeepResearch service returned %s: %s", response.status_code, detail
            )
            self.logger.debug(f"Response body: {detail}")
            from fastapi import HTTPException
            raise HTTPException(
                status_code=response.status_code, detail="DeepResearch service error"
            )

        result = response.json()
        self.logger.debug(f"Raw response JSON: {result}")

        answer = (
            result.get("prediction")
            or result.get("answer")
            or "No answer was returned by the deep research service."
        )
        termination = result.get("termination")

        self.logger.debug(f"Extracted answer: '{answer[:100]}...' (truncated)")
        self.logger.debug(f"Termination reason: '{termination}'")

        final_result = {
            "answer": answer,
            "citations": [],
            "confidence": "Medium",
            "reason": termination,
            "answerMatchType": "Synthesized",
            "metadata": {
                "mode": "deepresearch",
                "rounds": result.get("rounds"),
                "elapsedSeconds": result.get("elapsed_seconds"),
                "termination": termination,
                "serviceUrl": service_url,
            },
        }

        self.logger.debug(f"Final result metadata: {final_result['metadata']}")
        self.logger.debug("=== run_research COMPLETED ===")

        return final_result

    async def stream_research(
        self,
        query_info: DeepResearchQuery,
        emit: Callable[..., str],
    ) -> AsyncGenerator[str, None]:
        """
        Stream DeepResearch lifecycle events and the final answer via the service.

        This function implements a sophisticated pre-flight analysis:
        1. Analyzes query and creates research plan with confidence scoring
        2. High confidence (90-100%): Proceeds immediately with research
        3. Medium confidence (50-89%): Shows plan to user, awaits confirmation
        4. Low confidence (0-49%): Asks clarifying questions

        Args:
            query_info: The research query with optional confirmation/clarification flags
            emit: Callback function to emit SSE events

        Yields:
            SSE event strings
        """
        self.logger.debug("=== stream_research STARTED ===")
        self.logger.debug(
            f"Query info: query='{query_info.query}', "
            f"isClarificationResponse={query_info.isClarificationResponse}, "
            f"isPlanConfirmation={query_info.isPlanConfirmation}"
        )

        # Determine the final query to use for research
        research_query = query_info.query
        if query_info.isClarificationResponse and query_info.originalQuery:
            # Combine original query with user's clarification response
            research_query = (
                f"Original question: {query_info.originalQuery}\n\n"
                f"User clarification: {query_info.query}"
            )
            self.logger.debug(f"Combined clarification query: '{research_query}'")
        elif query_info.isPlanConfirmation and query_info.originalQuery:
            # User confirmed the plan - use original query for research
            research_query = query_info.originalQuery
            self.logger.debug(f"Plan confirmed, using original query: '{research_query}'")

        try:
            self.logger.debug("Emitting initial deepresearch_started status")
            yield emit(
                "status",
                "deepresearch_started",
                "Analyzing your research question...",
                status="deepresearch_started",
            )

            # Skip planning analysis if this is a confirmation or clarification response
            skip_planning = (
                query_info.isClarificationResponse or query_info.isPlanConfirmation
            )
            plan_result = None  # Will be set if planning analysis runs

            if skip_planning:
                self.logger.debug(
                    f"Skipping planning analysis - "
                    f"isClarificationResponse={query_info.isClarificationResponse}, "
                    f"isPlanConfirmation={query_info.isPlanConfirmation}"
                )
            else:
                self.logger.debug("Starting comprehensive research planning analysis")
                yield emit(
                    "status",
                    "planning_analysis",
                    "Creating research plan and analyzing query clarity...",
                    status="planning_analysis",
                )

                # Comprehensive planning analysis with confidence scoring
                plan_result = await self.analyze_query_and_create_plan(query_info.query)
                self.logger.debug(
                    f"Planning analysis result: "
                    f"confidence={plan_result.get('confidence_score')}% "
                    f"({plan_result.get('confidence_level')})"
                )

                confidence_level = plan_result.get("confidence_level", "high")

                # === LOW CONFIDENCE: Ask clarifying questions ===
                if plan_result.get("needs_clarification") or confidence_level == "low":
                    self.logger.debug(
                        "Low confidence - Query needs clarification, "
                        "emitting clarification_request event"
                    )

                    clarifying_questions = plan_result.get("clarifying_questions", [])
                    identified_gaps = plan_result.get("identified_gaps", [])

                    if clarifying_questions:
                        question_text = "\n".join(
                            f"• {q}" for q in clarifying_questions
                        )
                    else:
                        question_text = (
                            "Could you please provide more details about your question?"
                        )

                    yield emit(
                        "clarification_request",
                        "clarification_needed",
                        question_text,
                        question=question_text,
                        reason=plan_result.get("reasoning", ""),
                        originalQuery=query_info.query,
                        confidenceScore=plan_result.get("confidence_score", 0),
                        identifiedGaps=identified_gaps,
                    )

                    yield emit(
                        "complete",
                        "clarification_needed",
                        "Clarification required",
                        answer=question_text,
                        citations=[],
                        confidence="",
                        reason="clarification_needed",
                        answerMatchType="Clarification",
                        isClarificationRequest=True,
                        originalQuery=query_info.query,
                        clarificationReason=plan_result.get("reasoning", ""),
                        confidenceScore=plan_result.get("confidence_score", 0),
                    )
                    self.logger.debug(
                        "=== stream_research COMPLETED (CLARIFICATION NEEDED) ==="
                    )
                    return

                # === MEDIUM CONFIDENCE: Show plan and await confirmation ===
                if plan_result.get("needs_confirmation") or confidence_level == "medium":
                    self.logger.debug(
                        "Medium confidence - Showing research plan, "
                        "awaiting user confirmation"
                    )

                    research_plan = plan_result.get("research_plan", [])
                    assumptions = plan_result.get("assumptions", [])
                    identified_gaps = plan_result.get("identified_gaps", [])

                    yield emit(
                        "research_plan_ready",
                        "plan_awaiting_confirmation",
                        "Research plan created - awaiting your confirmation",
                        confidenceScore=plan_result.get("confidence_score", 75),
                        confidenceLevel=confidence_level,
                        researchPlan=research_plan,
                        assumptions=assumptions,
                        identifiedGaps=identified_gaps,
                        reasoning=plan_result.get("reasoning", ""),
                        originalQuery=query_info.query,
                        needsConfirmation=True,
                    )

                    yield emit(
                        "complete",
                        "plan_awaiting_confirmation",
                        "Research plan ready for confirmation",
                        answer="",
                        citations=[],
                        confidence="",
                        reason="plan_awaiting_confirmation",
                        answerMatchType="PlanConfirmation",
                        isPlanConfirmation=True,
                        originalQuery=query_info.query,
                        researchPlan=research_plan,
                        assumptions=assumptions,
                        confidenceScore=plan_result.get("confidence_score", 75),
                    )
                    self.logger.debug(
                        "=== stream_research COMPLETED (PLAN AWAITING CONFIRMATION) ==="
                    )
                    return

                # === HIGH CONFIDENCE: Proceed immediately ===
                self.logger.debug(
                    f"High confidence ({plan_result.get('confidence_score')}%) - "
                    "Proceeding with research immediately"
                )

                # Optionally emit the plan for transparency
                if plan_result.get("research_plan"):
                    yield emit(
                        "research_plan_ready",
                        "plan_auto_confirmed",
                        "Research plan created - proceeding automatically (high confidence)",
                        confidenceScore=plan_result.get("confidence_score", 95),
                        confidenceLevel="high",
                        researchPlan=plan_result.get("research_plan", []),
                        assumptions=[],
                        identifiedGaps=[],
                        reasoning=plan_result.get("reasoning", ""),
                        originalQuery=query_info.query,
                        needsConfirmation=False,
                        autoProceeding=True,
                    )

            self.logger.debug("Query is clear, proceeding with streaming research")
            yield emit(
                "status",
                "research_starting",
                "Starting deep research...",
                status="research_starting",
            )

            self.logger.debug("Setting up streaming from DeepResearch service")
            service_url = f"{self.service_url}/api/v1/research/stream"

            # Determine if we have a pre-defined plan
            # Priority: 1. User-confirmed plan, 2. Auto-confirmed plan from SLM (high confidence)
            pre_defined_plan = None
            if query_info.isPlanConfirmation and query_info.confirmedPlan:
                pre_defined_plan = query_info.confirmedPlan
                self.logger.debug(f"Using user-confirmed plan with {len(pre_defined_plan)} steps")
            elif not skip_planning and plan_result and plan_result.get("research_plan"):
                # High confidence case - use the plan from SLM analysis
                pre_defined_plan = plan_result.get("research_plan")
                self.logger.debug(f"Using auto-confirmed plan from SLM with {len(pre_defined_plan)} steps")

            payload = {
                "question": research_query,
                "enable_planning": not bool(pre_defined_plan),  # Skip planning if we have a plan
                "research_plan": pre_defined_plan,  # Pass the pre-defined plan
            }

            self.logger.debug(f"Streaming URL: {service_url}")
            self.logger.debug(f"Streaming payload: enable_planning={payload['enable_planning']}, has_research_plan={pre_defined_plan is not None}")

            accumulated_answer = ""
            sources: List[Dict[str, Any]] = []
            thinking_content = ""
            research_plan: List[str] = []
            final_data: Dict[str, Any] = {}

            try:
                self.logger.debug(
                    "Opening streaming connection to DeepResearch service"
                )
                async with httpx.AsyncClient(timeout=600) as client:
                    async with client.stream(
                        "POST", service_url, json=payload
                    ) as response:
                        self.logger.debug(
                            f"Stream response status: {response.status_code}"
                        )
                        if response.status_code != 200:
                            error_text = await response.aread()
                            self.logger.error(
                                "DeepResearch stream failed: %s %s",
                                response.status_code,
                                error_text,
                            )
                            yield emit(
                                "error",
                                "deepresearch_error",
                                f"DeepResearch service error: {response.status_code}",
                                error=(
                                    error_text.decode()
                                    if isinstance(error_text, bytes)
                                    else str(error_text)
                                ),
                            )
                            return

                        buffer = ""
                        current_event = ""
                        event_count = 0

                        self.logger.debug("Starting event processing loop")
                        async for chunk in response.aiter_text():
                            self.logger.debug(
                                f"Received chunk of length {len(chunk)}"
                            )
                            buffer += chunk
                            lines = buffer.split("\n")
                            buffer = lines.pop()

                            for line in lines:
                                line = line.strip()
                                if not line:
                                    continue

                                self.logger.debug(
                                    f"Processing line: '{line[:100]}...' (truncated)"
                                )
                                if line.startswith("event: "):
                                    current_event = line[7:].strip()
                                    self.logger.debug(f"Event type: {current_event}")
                                elif line.startswith("data: ") and current_event:
                                    try:
                                        data = json.loads(line[6:])
                                        event_count += 1
                                        self.logger.debug(
                                            f"Processing event {event_count}: "
                                            f"{current_event}"
                                        )

                                        # Process and forward events
                                        async for event in self._process_stream_event(
                                            current_event,
                                            data,
                                            emit,
                                            accumulated_answer,
                                            sources,
                                            thinking_content,
                                            research_plan,
                                            final_data,
                                        ):
                                            if isinstance(event, dict):
                                                # Update accumulators
                                                accumulated_answer = event.get(
                                                    "accumulated_answer",
                                                    accumulated_answer,
                                                )
                                                sources = event.get("sources", sources)
                                                thinking_content = event.get(
                                                    "thinking_content", thinking_content
                                                )
                                                research_plan = event.get(
                                                    "research_plan", research_plan
                                                )
                                                final_data = event.get(
                                                    "final_data", final_data
                                                )
                                            else:
                                                yield event

                                    except json.JSONDecodeError as e:
                                        self.logger.warning(
                                            f"Failed to parse SSE data: {e}"
                                        )
                                        continue

                        self.logger.debug(
                            f"Event processing completed. Total events: {event_count}"
                        )

            except httpx.TimeoutException:
                self.logger.error("DeepResearch service timeout")
                yield emit(
                    "error",
                    "deepresearch_timeout",
                    "Deep research timed out. Please try a more specific question.",
                    error="Service timeout",
                )
                self.logger.debug("=== stream_research COMPLETED (TIMEOUT) ===")
                return
            except Exception as exc:
                self.logger.error(
                    "DeepResearch streaming failed: %s", exc, exc_info=True
                )
                yield emit(
                    "error",
                    "deepresearch_error",
                    "DeepResearch execution failed",
                    error=str(exc),
                )
                self.logger.debug("=== stream_research COMPLETED (ERROR) ===")
                return

            self.logger.debug("Emitting meta event")
            yield emit(
                "meta",
                "meta",
                "DeepResearch summary",
                knowledgeUsed=False,
                retrievalStrategy="deepresearch",
                sourcesCount=len(sources),
                steps=(
                    ["planning", "research", "synthesis"]
                    if research_plan
                    else ["research", "synthesis"]
                ),
            )

            self.logger.debug("Emitting final complete event")
            final_metadata = {
                "mode": "deepresearch",
                "rounds": final_data.get("rounds"),
                "elapsedSeconds": final_data.get("elapsedSeconds"),
                "termination": final_data.get("termination"),
                "serviceUrl": self.service_url,
            }
            self.logger.debug(f"Final answer length: {len(accumulated_answer)}")
            self.logger.debug(f"Final sources count: {len(sources)}")

            yield emit(
                "complete",
                "complete",
                "Deep research completed",
                answer=accumulated_answer,
                citations=[],
                confidence="Medium",
                reason=final_data.get("termination", "completed"),
                answerMatchType="Synthesized",
                sources=sources,
                thinking=thinking_content if thinking_content else None,
                researchPlan=research_plan if research_plan else None,
                metadata=final_metadata,
            )

            self.logger.debug("=== stream_research COMPLETED (SUCCESS) ===")

        except Exception as exc:
            self.logger.error(
                "DeepResearch execution failed: %s", exc, exc_info=True
            )
            yield emit(
                "error",
                "deepresearch_error",
                "DeepResearch execution failed",
                error=str(exc),
            )
            self.logger.debug("=== stream_research COMPLETED (EXCEPTION) ===")
            return

    async def _process_stream_event(
        self,
        event_type: str,
        data: Dict[str, Any],
        emit: Callable[..., str],
        accumulated_answer: str,
        sources: List[Dict[str, Any]],
        thinking_content: str,
        research_plan: List[str],
        final_data: Dict[str, Any],
    ) -> AsyncGenerator[Any, None]:
        """
        Process a single stream event and yield SSE events or state updates.

        Args:
            event_type: The type of event (status, plan, answer_chunk, etc.)
            data: The event data payload
            emit: Callback to emit SSE events
            accumulated_answer: Current accumulated answer text
            sources: Current list of sources
            thinking_content: Current thinking/reasoning content
            research_plan: Current research plan steps
            final_data: Final completion data

        Yields:
            Either SSE event strings or dict with updated state
        """
        if event_type == "status":
            self.logger.debug(f"Forwarding status event: {data.get('step', 'processing')}")
            yield emit(
                "status",
                data.get("step", "processing"),
                data.get("message", "Processing..."),
                **{k: v for k, v in data.items() if k not in ["step", "message"]},
            )

        elif event_type == "plan":
            research_plan = data.get("subQuestions", [])
            self.logger.debug(
                f"Received research plan with {len(research_plan)} sub-questions"
            )
            yield emit(
                "status",
                "plan_created",
                f"Research plan: {len(research_plan)} sub-questions",
                subQuestions=research_plan,
            )
            yield {"research_plan": research_plan}

        elif event_type == "thinking_chunk":
            chunk = data.get("chunk", "")
            thinking_content += chunk
            self.logger.debug(f"Received thinking chunk of length {len(chunk)}")
            yield emit(
                "thinking_chunk",
                "thinking",
                data.get("message"),
                chunk=chunk,
            )
            yield {"thinking_content": thinking_content}

        elif event_type == "thinking_complete":
            thinking_content = data.get("thinking", thinking_content)
            self.logger.debug(
                f"Thinking complete, total length: {len(thinking_content)}"
            )
            yield emit(
                "thinking_complete",
                "thinking_done",
                "Reasoning complete",
                thinking=thinking_content,
            )
            yield {"thinking_content": thinking_content}

        elif event_type == "tool_call":
            tool_name = data.get("toolName", "unknown")
            self.logger.debug(f"Tool call: {tool_name}")
            yield emit(
                "tool_call",
                data.get("step", "tool_call"),
                data.get("message", f"Using tool: {tool_name}"),
                toolName=tool_name,
                toolArgs=data.get("toolArgs"),
            )

        elif event_type == "tool_result":
            tool_name = data.get("toolName", "unknown")
            self.logger.debug(f"Tool result received for: {tool_name}")
            yield emit(
                "tool_result",
                "tool_complete",
                data.get("message", "Tool completed"),
                toolName=tool_name,
                resultPreview=data.get("resultPreview"),
            )

        elif event_type == "web_search":
            queries = data.get("queries", [])
            self.logger.debug(f"Web search started with {len(queries)} queries")
            yield emit(
                "web_search",
                "searching",
                data.get("message", "Searching the web..."),
                queries=queries,
            )

        elif event_type == "web_results":
            sources = data.get("sources", [])
            self.logger.debug(f"Web results received: {len(sources)} sources")
            yield emit(
                "web_results",
                "sources_ready",
                f"Found {len(sources)} sources",
                sources=sources,
                totalResults=len(sources),
            )
            yield {"sources": sources}

        elif event_type == "answer_chunk":
            chunk = data.get("chunk", "")
            accumulated_answer += chunk
            self.logger.debug(
                f"Answer chunk received, length: {len(chunk)}, "
                f"total so far: {len(accumulated_answer)}"
            )
            yield emit(
                "answer_chunk",
                "answer",
                None,
                chunk=chunk,
            )
            yield {"accumulated_answer": accumulated_answer}

        elif event_type == "complete":
            final_data = data
            self.logger.debug("Complete event received")
            if not accumulated_answer:
                accumulated_answer = data.get("answer", "")
            if not sources:
                sources = data.get("sources", [])
            yield {
                "final_data": final_data,
                "accumulated_answer": accumulated_answer,
                "sources": sources,
            }

        elif event_type == "error":
            yield emit(
                "error",
                "deepresearch_error",
                data.get("message", "An error occurred"),
                error=data.get("error"),
            )

