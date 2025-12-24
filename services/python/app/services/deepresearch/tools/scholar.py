"""
Scholar Search Tool using local SearXNG instance.
Replaces the original Serper-based Google Scholar search.
"""

import os
from typing import Any, Dict, List

import httpx

from app.services.deepresearch.tools.base import BaseTool
from libs.core.logging import create_logger

logger = create_logger("deepresearch.tools.scholar")

# Local SearXNG endpoint
SEARXNG_URL = os.getenv("SEARXNG_URL", "http://searxng:8080")


class ScholarTool(BaseTool):
    """
    Academic/Scholar search tool using local SearXNG instance.

    Searches academic sources via SearXNG's scholar category.
    Falls back to general search with academic terms if scholar category fails.
    """

    name = "google_scholar"
    description = "Search for academic publications and scholarly sources. Accepts multiple queries."

    def __init__(self, searxng_url: str = None, timeout: float = 30.0):
        self.searxng_url = searxng_url or SEARXNG_URL
        self.timeout = timeout

    async def _search_scholar(self, query: str, num_results: int = 10) -> List[Dict[str, str]]:
        """
        Execute a scholar search query against SearXNG.

        Args:
            query: Search query string
            num_results: Maximum number of results to return

        Returns:
            List of result dicts with title, url, snippet
        """
        try:
            # Try scholar category first
            params = {
                "q": query,
                "format": "json",
                "categories": "science",
                "engines": "google_scholar,semantic_scholar,arxiv,pubmed",
                "language": "en",
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.searxng_url}/search", params=params)

                results = []

                if response.status_code == 200:
                    data = response.json()

                    if "results" in data and data["results"]:
                        for result in data["results"][:num_results]:
                            results.append({
                                "title": result.get("title", ""),
                                "url": result.get("url", ""),
                                "snippet": result.get("content", ""),
                                "source": result.get("engine", "unknown"),
                            })

                # If no results, try general search with academic keywords
                if not results:
                    logger.debug(f"No scholar results, trying general search for: {query}")
                    academic_query = f"{query} research paper academic"
                    params["categories"] = "general"
                    params["q"] = academic_query
                    params["engines"] = "duckduckgo,bing,google"

                    response = await client.get(f"{self.searxng_url}/search", params=params)

                    if response.status_code == 200:
                        data = response.json()
                        if "results" in data:
                            for result in data["results"][:num_results]:
                                results.append({
                                    "title": result.get("title", ""),
                                    "url": result.get("url", ""),
                                    "snippet": result.get("content", ""),
                                    "source": "general",
                                })

                return results

        except httpx.TimeoutException:
            logger.warning(f"Scholar search timeout for query: {query[:50]}...")
            return []
        except Exception as e:
            logger.error(f"Scholar search error for query '{query[:50]}...': {e}")
            return []

    async def call(self, params: Dict[str, Any], **kwargs) -> str:
        """
        Execute scholar search queries and return formatted results.

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
            logger.debug(f"Scholar searching: {query[:50]}...")
            results = await self._search_scholar(query)

            if results:
                query_results = f"\n### Academic Results for: {query}\n"
                for i, r in enumerate(results, 1):
                    query_results += f"\n{i}. **{r['title']}**\n"
                    query_results += f"   URL: {r['url']}\n"
                    query_results += f"   Source: {r.get('source', 'unknown')}\n"
                    if r['snippet']:
                        query_results += f"   {r['snippet']}\n"
                all_results.append(query_results)
            else:
                all_results.append(f"\n### No academic results found for: {query}\n")

        if not all_results:
            return "No academic search results found for any query."

        return "\n".join(all_results)

