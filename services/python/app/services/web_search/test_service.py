from typing import Optional

import pytest

from app.services.web_search.service import WebSearchService


class DummyConfigService:
    async def get_config(self, *args, **kwargs):
        return {}


class StubWebSearchService(WebSearchService):
    async def _ensure_endpoints(self) -> None:
        self._firecrawl_base_url = "http://firecrawl"
        self._searxng_base_url = "http://searxng"

    async def _query_firecrawl(
        self,
        client,
        *,
        query: str,
        limit: int,
        language: Optional[str],
    ):
        return [
            {
                "id": 1,
                "title": "Archived discussion",
                "url": "https://example.com/shared",
                "snippet": "historic forum entry",
                "content": "",
                "engine": "firecrawl",
            },
            {
                "id": 2,
                "title": "Legacy interview",
                "url": "https://example.com/archive",
                "snippet": "long form interview",
                "content": "",
                "engine": "firecrawl",
            },
        ]

    async def _query_searxng(
        self,
        client,
        *,
        query: str,
        limit: int,
        language: Optional[str],
    ):
        return [
            {
                "id": 1,
                "title": "OpenAI founders timeline",
                "url": "https://example.com/timeline",
                "snippet": "OpenAI founders timeline and context",
                "content": "",
                "engine": "searxng",
            },
            {
                "id": 2,
                "title": "Duplicate entry",
                "url": "https://example.com/shared",
                "snippet": "openai founders",
                "content": "",
                "engine": "searxng",
            },
        ]


@pytest.mark.asyncio
async def test_search_parallel_deduplicates_and_reranks():
    service = StubWebSearchService(DummyConfigService())

    payload = await service.search(
        "OpenAI founders",
        max_results=5,
        include_content=False,
    )

    urls = [item["url"] for item in payload["results"]]

    assert len(payload["results"]) == 3
    assert urls[0] == "https://example.com/timeline"
    assert payload["results"][0]["title"] == "OpenAI founders timeline"

