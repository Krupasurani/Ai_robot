"""
Visit Tool using local Firecrawl instance.
Replaces the original Jina-based web content extraction.
Updated for SOTA with SLM-based content summarization.
"""

import json
import os
from typing import Any, Dict, Optional

import httpx
import json5
from langchain.chat_models.base import BaseChatModel
from langchain_core.messages import HumanMessage

from app.services.deepresearch.prompts import EXTRACTOR_PROMPT
from app.services.deepresearch.tools.base import BaseTool
from libs.core.logging import create_logger

logger = create_logger("deepresearch.tools.visit")

# Local Firecrawl endpoint
FIRECRAWL_URL = os.getenv("FIRECRAWL_URL", "http://firecrawl-api:3002")
WEBCONTENT_MAXLENGTH = int(os.getenv("WEBCONTENT_MAXLENGTH", 150000))
# Max content length to send to SLM for extraction (to avoid context overflow)
SLM_MAX_CONTENT_LENGTH = int(os.getenv("SLM_MAX_CONTENT_LENGTH", 30000))


class VisitTool(BaseTool):
    """
    Web page visiting tool using local Firecrawl instance.

    Visits webpage(s) and extracts/summarizes content based on a goal.
    Uses an SLM (Small Language Model) for intelligent content extraction.
    """

    name = "visit"
    description = "Visit webpage(s) and return the summary of the content."

    def __init__(
        self,
        firecrawl_url: str = None,
        timeout: float = 60.0,
        max_content_length: int = None,
        slm_client: Optional[BaseChatModel] = None,
    ):
        self.firecrawl_url = firecrawl_url or FIRECRAWL_URL
        self.timeout = timeout
        self.max_content_length = max_content_length or WEBCONTENT_MAXLENGTH
        self.slm_client = slm_client

    def set_slm_client(self, slm_client: BaseChatModel) -> None:
        """Set the SLM client for content extraction."""
        self.slm_client = slm_client

    async def _scrape_url(self, url: str) -> Dict[str, Any]:
        """
        Scrape a single URL using Firecrawl.

        Args:
            url: URL to scrape

        Returns:
            Dict with scraped content or error
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                # Firecrawl scrape endpoint
                response = await client.post(
                    f"{self.firecrawl_url}/v1/scrape",
                    json={
                        "url": url,
                        "formats": ["markdown"],
                        "onlyMainContent": True,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    if data.get("success"):
                        content = data.get("data", {}).get("markdown", "")
                        # Truncate if too long
                        if len(content) > self.max_content_length:
                            content = content[:self.max_content_length] + "\n\n[Content truncated...]"
                        return {
                            "success": True,
                            "url": url,
                            "content": content,
                            "title": data.get("data", {}).get("metadata", {}).get("title", ""),
                        }
                    else:
                        return {
                            "success": False,
                            "url": url,
                            "error": data.get("error", "Unknown error"),
                        }
                else:
                    return {
                        "success": False,
                        "url": url,
                        "error": f"HTTP {response.status_code}",
                    }

        except httpx.TimeoutException:
            logger.warning(f"Timeout scraping URL: {url}")
            return {"success": False, "url": url, "error": "Timeout"}
        except Exception as e:
            logger.error(f"Error scraping URL '{url}': {e}")
            return {"success": False, "url": url, "error": str(e)}

    async def _extract_relevant_info(self, content: str, goal: str) -> str:
        """
        Extract relevant information from content based on goal using SLM.

        Uses the configured SLM to intelligently summarize webpage content
        based on the user's research goal, preventing context overflow.

        Args:
            content: Webpage content
            goal: Information extraction goal

        Returns:
            Extracted/summarized content as structured JSON or fallback text
        """
        # If no SLM client configured, fall back to simple truncation
        if self.slm_client is None:
            logger.debug("No SLM client configured, using simple truncation")
            if len(content) > 10000:
                return f"[Goal: {goal}]\n\n{content[:10000]}\n\n[Content truncated for brevity...]"
            return f"[Goal: {goal}]\n\n{content}"

        # Truncate content for SLM processing to avoid context overflow
        truncated_content = content
        if len(content) > SLM_MAX_CONTENT_LENGTH:
            truncated_content = content[:SLM_MAX_CONTENT_LENGTH] + "\n\n[Content truncated for processing...]"
            logger.debug(f"Truncated content from {len(content)} to {SLM_MAX_CONTENT_LENGTH} chars for SLM")

        # Build the extraction prompt
        extraction_prompt = EXTRACTOR_PROMPT.format(
            webpage_content=truncated_content,
            goal=goal,
        )

        try:
            logger.debug(f"Calling SLM for content extraction (goal: {goal[:50]}...)")

            # Call the SLM using LangChain interface
            response = await self.slm_client.ainvoke([HumanMessage(content=extraction_prompt)])
            response_text = response.content if hasattr(response, 'content') else str(response)

            # Try to parse as JSON for structured output
            try:
                # Handle potential markdown code blocks in response
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].split("```")[0].strip()

                extracted_data = json5.loads(response_text)

                # Format the structured response
                result_parts = []
                if extracted_data.get("summary"):
                    result_parts.append(f"**Summary:** {extracted_data['summary']}")
                if extracted_data.get("evidence"):
                    result_parts.append(f"\n**Evidence:**\n{extracted_data['evidence']}")
                if extracted_data.get("rational"):
                    result_parts.append(f"\n**Rational:** {extracted_data['rational']}")

                if result_parts:
                    return "\n".join(result_parts)
                else:
                    # JSON parsed but no expected fields
                    return response_text

            except (json.JSONDecodeError, ValueError):
                # If not valid JSON, return the raw response
                logger.debug("SLM response was not valid JSON, returning raw text")
                return response_text

        except Exception as e:
            logger.error(f"SLM extraction failed: {e}")
            # Fall back to simple truncation on error
            if len(content) > 10000:
                return f"[Goal: {goal}]\n\n{content[:10000]}\n\n[Content truncated - SLM extraction failed: {e}]"
            return f"[Goal: {goal}]\n\n{content}"

    async def call(self, params: Dict[str, Any], **kwargs) -> str:
        """
        Visit webpage(s) and extract content.

        Args:
            params: Dict with 'url' (string or list) and optional 'goal'

        Returns:
            Formatted string with webpage content
        """
        urls = params.get("url", [])
        goal = params.get("goal", "Extract main information from the webpage")

        # Normalize urls to list
        if isinstance(urls, str):
            urls = [urls]

        if not urls:
            return "Error: No URLs provided"

        results = []

        for url in urls:
            logger.debug(f"Visiting: {url}")
            scrape_result = await self._scrape_url(url)

            if scrape_result.get("success"):
                content = scrape_result.get("content", "")
                title = scrape_result.get("title", "Untitled")

                # Use async extraction with SLM
                extracted = await self._extract_relevant_info(content, goal)

                result_text = f"\n## {title}\n**URL:** {url}\n\n{extracted}\n"
                results.append(result_text)
            else:
                error = scrape_result.get("error", "Unknown error")
                results.append(f"\n## Failed to load: {url}\n**Error:** {error}\n")

        if not results:
            return "No webpages could be loaded."

        return "\n---\n".join(results)

