"""
Search Tool using local SearXNG instance.
Replaces the original Serper-based search.
"""

import os
from typing import Any, Dict, List

import httpx

from app.services.deepresearch.tools.base import BaseTool
from libs.core.logging import create_logger

logger = create_logger("deepresearch.tools.search")

# Local SearXNG endpoint
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://searxng:8080")
SEARXNG_ENGINES = os.getenv(
    "SEARXNG_ENGINES",
    # Default to a broader mix; override via env to match your SearXNG config
    "duckduckgo,google,bing",
)


class SearchTool(BaseTool):
    """
    Web search tool using local SearXNG instance.

    Performs batched web searches and returns top results for each query.
    """

    name = "search"
    description = "Perform web searches then returns a string of the top search results. Accepts multiple queries."

    def __init__(self, searxng_url: str = None, timeout: float = 30.0):
        self.searxng_url = searxng_url or SEARXNG_URL
        self.timeout = timeout
        self.engines = SEARXNG_ENGINES

    async def _search_single(self, query: str, num_results: int = 10) -> List[Dict[str, str]]:
        """
        Execute a single search query against SearXNG.

        Args:
            query: Search query string
            num_results: Maximum number of results to return

        Returns:
            List of result dicts with title, url, snippet
        """
        try:
            params = {
                "q": query,
                "format": "json",
                "categories": "general",
                "engines": self.engines,
                "language": "auto",
                "safesearch": 1,
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.searxng_url}/search", params=params)
                response.raise_for_status()

                data = response.json()
                results = []

                if "results" in data:
                    for result in data["results"][:num_results]:
                        results.append({
                            "title": result.get("title", ""),
                            "url": result.get("url", ""),
                            "snippet": result.get("content", ""),
                        })

                return results

        except httpx.TimeoutException:
            logger.warning(f"Search timeout for query: {query[:50]}...")
            return []
        except Exception as e:
            logger.error(f"Search error for query '{query[:50]}...': {e}")
            return []

    async def call(self, params: Dict[str, Any], **kwargs) -> str:
        """
        Execute search queries and return formatted results.

        Args:
            params: Dict with 'query' key containing list of search queries

        Returns:
            Formatted string of search results
        """
        queries = params.get("query", [])
        if isinstance(queries, str):
            queries = [queries]

        if not queries:
            return "Error: No search queries provided"

        all_results = []

        for query in queries:
            logger.debug(f"Searching: {query[:50]}...")
            results = await self._search_single(query)

            if results:
                query_results = f"\n### Results for: {query}\n"
                for i, r in enumerate(results, 1):
                    query_results += f"\n{i}. **{r['title']}**\n"
                    query_results += f"   URL: {r['url']}\n"
                    if r['snippet']:
                        query_results += f"   {r['snippet']}\n"
                all_results.append(query_results)
            else:
                all_results.append(f"\n### No results found for: {query}\n")

        if not all_results:
            return "No search results found for any query."

        return "\n".join(all_results)
