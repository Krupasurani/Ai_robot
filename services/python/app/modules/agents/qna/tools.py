import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Type

from langchain.schema import HumanMessage
from langchain.tools import BaseTool
from pydantic import BaseModel, ConfigDict, Field

from app.modules.agents.qna.chat_state import ChatState
from app.services.web_search.service import WebSearchService
from app.utils.aimodels import ModelType


class WriteToFileInput(BaseModel):
    content: str = Field(description="Content to write to the file")
    filename: Optional[str] = Field(default=None, description="Optional filename, will use default if not provided")
    append: bool = Field(default=False, description="Whether to append to existing file or overwrite")


class WebSearchInput(BaseModel):
    query: str = Field(description="Search query to search on the web")
    max_results: Optional[int] = Field(default=5, description="Maximum number of search results to return (default: 5)")
    max_pages: Optional[int] = Field(default=2, description="Maximum number of pages to fetch content for (default: 2)")
    include_content: Optional[bool] = Field(default=True, description="Whether to fetch page content via Firecrawl")
    language: Optional[str] = Field(default=None, description="Preferred language code for Searxng (e.g., en, de)")


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = "Search the web for current information. Use this when you need to find recent, up-to-date information that may not be in the knowledge base."
    args_schema: Type[BaseModel] = WebSearchInput

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, state: ChatState, **kwargs) -> None:
        super().__init__(**kwargs)
        self._state = state
        self._search_service: Optional[WebSearchService] = None

    @property
    def state(self) -> ChatState:
        return self._state

    def _get_config_service(self):
        """Locate the configuration service needed by WebSearchService."""
        retrieval_service = self.state.get("retrieval_service")
        if retrieval_service and hasattr(retrieval_service, "config_service"):
            return retrieval_service.config_service
        return self.state.get("config_service")

    def _get_search_service(self) -> Optional[WebSearchService]:
        """Create or return the shared WebSearchService instance."""
        if self._search_service:
            return self._search_service

        config_service = self._get_config_service()
        if not config_service:
            self.state["logger"].error("Web search tool missing configuration service")
            return None

        self._search_service = WebSearchService(config_service, self.state.get("logger"))
        return self._search_service

    def _record_event(self, event_type: str, step: str, message: Optional[str] = None, **extra: Any) -> None:
        recorder = self.state.get("event_recorder")
        if callable(recorder):
            try:
                recorder(event_type, step, message, **extra)
            except Exception:
                logger = self.state.get("logger")
                if logger:
                    logger.debug("WebSearchTool event recorder failed for step %s", step, exc_info=True)

    async def _correct_query_with_slm(self, query: str) -> List[str]:
        """
        Use a small / cost-efficient LLM (via our central configuration service)
        to clean up and optimize web search queries.

        Returns a list of up to 5 optimized queries; falls back to the original
        query on any error.
        """
        config_service = self._get_config_service()
        if not config_service:
            return [query]

        # Import here to avoid circulars at module import time.
        try:
            from app.utils.llm import get_llm

            slm, _config = await get_llm(config_service, model_type=ModelType.SLM.value)
        except Exception as exc:
            self.state["logger"].warning(
                f"SLM initialization failed for web search optimization, using raw query: {exc}"
            )
            return [query]

        current_datetime = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        prompt = (
            f"Current date: {current_datetime}\n"
            "Optimize the user's query for web search. "
            "Return exactly 3 distinct queries: "
            "1. Direct question "
            "2. Keyword-based "
            "3. Broader context\n"
            "Output ONLY the 3 queries, one per line.\n\n"
            f"User query: {query}"
        )

        # print(f"Prompt WebSerach: {prompt}")

        try:
            response = await slm.ainvoke([HumanMessage(content=prompt)])
            raw_text = getattr(response, "content", response)
            # print(f"Response WebSerach: {raw_text}")
            lines = [line.strip() for line in str(raw_text).split("\n") if line.strip()]

            cleaned: List[str] = []
            for line in lines:
                # Strip common bullet / numbering prefixes just in case
                candidate = line.lstrip("-*•").strip()
                if candidate and candidate[0].isdigit():
                    parts = candidate.split(" ", 1)
                    if len(parts) == 2:
                        candidate = parts[1].strip()
                if candidate:
                    cleaned.append(candidate)

            if not cleaned:
                # print(f"No cleaned queries found, using original query: {query}")
                return [query]

            # Hard cap: never use more than 3 optimized queries to avoid
            # excessive parallel web searches for simple fact questions.
            optimized = cleaned[:3]
            self.state["logger"].info(f"Optimized web search queries (SLM): {optimized}")
            self._record_event(
                "web_search",
                "web_search_query_optimized",
                "Optimized web search variants generated",
                optimizedQueries=optimized,
            )
            # print(f"Optimized web search queries (SLM): {optimized}")
            return optimized

        except Exception as exc:
            self.state["logger"].warning(
                f"SLM query optimization failed, using raw query: {exc}"
            )
            self._record_event(
                "web_search",
                "web_search_query_optimized",
                "Query optimization failed; using raw query",
                error=str(exc),
            )
            # print(f"SLM query optimization failed, using raw query: {exc}")
            return [query]

    def _prepare_response(
        self,
        queries: List[str],
        raw_result: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Prepare a normalized response and persist metadata in state."""
        results = raw_result.get("results") or []
        status = "success" if results else "no_results"
        message = (
            f"Found {len(results)} web search results"
            if results
            else "No current web results found. AI will use existing knowledge instead."
        )

        # Persist in state for downstream prompts/tooling
        if queries:
            self.state.setdefault("web_search_queries", []).extend(queries)
        self.state["web_search_results"] = results
        self.state["web_search_template_context"] = {
            "fetched_at": raw_result.get("fetched_at"),
            "total_results": len(results),
        }

        return {
            "status": status,
            # Primary query used (first optimized query if available)
            "query": queries[0] if queries else None,
            # All optimized queries that were executed
            "queries": queries,
            "results": results,
            "total_results": len(results),
            "fetched_at": raw_result.get("fetched_at"),
            "message": message,
            "fallback_to_knowledge": status == "no_results",
        }

    async def _execute_search_async(
        self,
        query: str,
        max_results: int,
        max_pages: int,
        include_content: bool,
        language: Optional[str],
    ) -> Dict[str, Any]:
        # Correct / optimize the raw query using a small LLM configured via our
        # central AI model configuration. We now execute a web search for
        # *each* optimized query and aggregate the results.
        # Respect the caller's max_results to keep overall result count – and
        # thus downstream context size – bounded for performance.
        safe_max_results = max(1, min(int(max_results) if max_results else 5, 25))
        corrected_queries = await self._correct_query_with_slm(query)
        search_queries: List[str] = corrected_queries or [query]
        self._record_event(
            "web_search",
            "web_search_prepare",
            "Preparing web search execution",
            originalQuery=query,
            optimizedQueries=search_queries,
            includeContent=include_content,
            language=language,
        )

        service = self._get_search_service()
        if not service:
            return {
                "status": "error",
                "message": "Web search configuration missing; cannot reach Firecrawl backend",
                "fallback_to_knowledge": True,
            }

        # Dynamic adjustment:
        # - We request a small, bounded number of results per query to ensure coverage.
        # - We execute queries in parallel.
        # - We deduplicate results by URL.
        # - We cap the final aggregated list at safe_max_results.
        # - The "dynamic" count naturally arises from the number of queries the SLM generates (1‑3).
        per_query_results = min(5, safe_max_results)
        # Honour the caller's max_pages but keep it small for performance (and never above 2).
        per_query_pages = max(1, min(max_pages, 2))

        logger = self.state.get("logger")
        if logger:
            logger.info(
                "Executing web search for optimized queries (parallel, results/query=%s): %s",
                per_query_results,
                search_queries,
            )

        async def _single_search(q: str) -> Dict[str, Any]:
            try:
                return await service.search(
                    query=q,
                    max_results=per_query_results,
                    max_pages=per_query_pages,
                    language=language,
                    include_content=include_content,
                    on_event=self._record_event,
                )
            except Exception as exc:
                if logger:
                    logger.error(f"Web search failed for query '{q}': {exc}")
                return {}

        # Limit the number of optimized queries we actually execute to at most 3
        # to avoid over-querying web search backends for simple fact questions.
        search_queries = search_queries[:3]
        self._record_event(
            "web_search",
            "web_search_parallel_execution",
            "Executing optimized queries in parallel",
            queryCount=len(search_queries),
            resultsPerQuery=per_query_results,
            maxPages=per_query_pages,
        )

        # Parallel execution
        tasks = [_single_search(q) for q in search_queries]
        results_list = await asyncio.gather(*tasks)

        # Aggregation & Deduplication
        all_results: List[Dict[str, Any]] = []
        seen_urls = set()
        last_fetched_at: Optional[str] = None

        for payload in results_list:
            if not payload:
                continue

            # Keep the latest timestamp
            ts = payload.get("fetched_at")
            if ts:
                last_fetched_at = ts

            for item in payload.get("results") or []:
                url = item.get("url")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    all_results.append(item)

        # Enforce user-requested bounds for total results. We cannot invent
        # results if fewer than requested were found.
        final_results = all_results[:safe_max_results]

        combined_payload = {
            "results": final_results,
            "fetched_at": last_fetched_at,
        }

        self._record_event(
            "web_search",
            "web_search_tool_complete",
            "Aggregated web search results",
            totalResults=len(final_results),
            uniqueSources=len(seen_urls),
        )

        return self._prepare_response(search_queries, combined_payload)

    def _run(
        self,
        query: str,
        max_results: Optional[int] = 5,
        max_pages: Optional[int] = 2,
        include_content: Optional[bool] = True,
        language: Optional[str] = None,
    ) -> str:
        """Search the web via the Firecrawl backend (synchronous wrapper)."""
        try:
            if not query or not str(query).strip():
                return json.dumps({
                    "status": "error",
                    "message": "Search query cannot be empty"
                }, indent=2)

            query = str(query).strip()
            safe_max_results = max(1, min(int(max_results) if max_results else 5, 10))
            derived_pages = int(max_pages) if max_pages else safe_max_results
            safe_max_pages = max(1, min(derived_pages, safe_max_results))
            include_content = bool(include_content)

            self.state["logger"].info(f"Performing web search for: {query}")
            coro = self._execute_search_async(
                query=query,
                max_results=safe_max_results,
                max_pages=safe_max_pages,
                include_content=include_content,
                language=language,
            )

            try:
                result = asyncio.run(coro)
            except RuntimeError:
                # Fallback when already inside a running event loop
                loop = asyncio.new_event_loop()
                try:
                    asyncio.set_event_loop(loop)
                    result = loop.run_until_complete(coro)
                finally:
                    asyncio.set_event_loop(None)
                    loop.close()

            return json.dumps(result, indent=2)

        except Exception as e:
            error_msg = f"Web search error: {str(e)}"
            self.state["logger"].error(error_msg)
            return json.dumps({
                "status": "error",
                "message": error_msg,
                "fallback_to_knowledge": True
            }, indent=2)

    async def _arun(
        self,
        query: str,
        max_results: Optional[int] = 5,
        max_pages: Optional[int] = 2,
        include_content: Optional[bool] = True,
        language: Optional[str] = None,
    ) -> str:
        """Async entrypoint for web search tool."""
        if not query or not str(query).strip():
            return json.dumps({
                "status": "error",
                "message": "Search query cannot be empty"
            }, indent=2)

        query = str(query).strip()
        safe_max_results = max(1, min(int(max_results) if max_results else 5, 10))
        derived_pages = int(max_pages) if max_pages else safe_max_results
        safe_max_pages = max(1, min(derived_pages, safe_max_results))
        include_content = bool(include_content)

        self.state["logger"].info(f"Performing web search for: {query}")
        result = await self._execute_search_async(
            query=query,
            max_results=safe_max_results,
            max_pages=safe_max_pages,
            include_content=include_content,
            language=language,
        )
        return json.dumps(result, indent=2)


class WriteToFileTool(BaseTool):
    name: str = "write_to_file"
    description: str = "Write content to a file. Useful for saving responses, reports, or any generated content."
    args_schema: Type[BaseModel] = WriteToFileInput

    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, state: ChatState, **kwargs) -> None:
        super().__init__(**kwargs)
        self._state = state

    @property
    def state(self) -> ChatState:
        return self._state

    def _run(self, content: str, filename: Optional[str] = None, append: bool = False) -> str:
        """Write content to a file"""
        try:
            if not content:
                return json.dumps({
                    "status": "error",
                    "message": "Content cannot be empty"
                }, indent=2)

            content = str(content)

            if isinstance(append, str):
                append = append.lower() in ['true', '1', 'yes', 'on']
            elif not isinstance(append, bool):
                append = bool(append)

            # Determine file path
            if filename:
                file_path = Path(filename)
            elif self.state.get("output_file_path"):
                file_path = Path(self.state["output_file_path"])
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                default_filename = f"ai_summary_{timestamp}.md"
                file_path = Path(default_filename)

            # Ensure directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)

            # Write file
            mode = "a" if append else "w"
            with open(file_path, mode, encoding="utf-8") as f:
                f.write(content)
                if append:
                    f.write("\n")

            self.state["logger"].info(f"Content written to file: {file_path}")

            return json.dumps({
                "status": "success",
                "file_path": str(file_path),
                "content_length": len(content),
                "operation": "append" if append else "write",
                "message": f"Successfully saved content to {file_path}"
            }, indent=2)

        except Exception as e:
            error_msg = f"Error writing to file: {str(e)}"
            self.state["logger"].error(error_msg)
            return json.dumps({
                "status": "error",
                "message": error_msg
            }, indent=2)


async def _correct_query_with_slm(self, query: str) -> List[str]:
    from app.utils.llm import get_llm  # Import if needed
    slm, _ = await get_llm(self._get_config_service(), model_name='phi-3-mini')  # Use small model
    prompt = f"Correct any typos in this query and suggest 1-2 improved versions for web search: {query}"
    response = await slm.ainvoke(prompt)
    return [q.strip() for q in response.content.split('\n') if q.strip()] or [query]  # Fallback to original


def get_agent_tools(state: ChatState) -> list:
    """Get available tools for the agent based on configuration"""
    tools = []
    enabled_tools = state.get("tools", [])

    if not enabled_tools:
        return tools

    available_tools = {
        "write_to_file": WriteToFileTool(state),
        "web_search": WebSearchTool(state),
    }

    for tool_name in enabled_tools:
        if tool_name in available_tools:
            tools.append(available_tools[tool_name])
        else:
            state["logger"].warning(f"Unknown tool name: {tool_name}")

    return tools


def get_tool_by_name(tool_name: str, state: ChatState) -> BaseTool:
    """Get a specific tool by name"""
    available_tools = {
        "write_to_file": WriteToFileTool(state),
        "web_search": WebSearchTool(state),
    }
    return available_tools.get(tool_name)


def get_all_available_tool_names() -> list:
    """Get list of all available tool names"""
    return ["write_to_file", "web_search"]
