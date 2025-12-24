import asyncio
import json
import os
import random  # Neu für User-Agents
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx

from libs.core.config import ConfigurationService
from libs.core.constants import ConfigPath as config_node_constants
from libs.core.logging import create_logger


class WebSearchService:
    """Helper that uses Firecrawl for web-grounded answers."""

    def __init__(self, config_service: ConfigurationService, logger=None) -> None:
        self.config_service = config_service
        self.logger = logger or create_logger("web_search")
        self._searxng_base_url: Optional[str] = None
        self._firecrawl_base_url: Optional[str] = None

        # Aggressiveres Timeout für Connections (Connect muss schnell gehen)
        self._timeout = httpx.Timeout(10.0, connect=3.0)
        self._semaphore = asyncio.Semaphore(10)

        # UPGRADE: User-Agent Rotation
        self._user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        ]

        # Einstellungen für Speed
        self._max_enrichment_pages = 2
        # UPGRADE: Wenn Firecrawl länger als 2.5s braucht, abbrechen.
        # Die UX leidet massiv bei >3s Wartezeit.
        self._enrichment_timeout_seconds = 2.5

    def _get_headers(self) -> Dict[str, str]:
        return {
            "User-Agent": random.choice(self._user_agents),
            "Accept": "application/json",
        }

    @staticmethod
    def _emit_event(
        callback: Optional[Callable[..., None]],
        step: str,
        message: Optional[str] = None,
        **extra: Any,
    ) -> None:
        if callable(callback):
            try:
                callback("web_search", step, message, **extra)
            except Exception:
                # Event callbacks should never break the search flow
                pass

    def _normalize_endpoint(self, raw_value: Any, *, env_var: str, fallback: str, name: str) -> str:
        """
        Normalize endpoint values to a string, tolerating the different shapes we
        store in etcd (plain string, JSON string, or dict with endpoint/baseUrl/url).
        """
        if isinstance(raw_value, str) and raw_value.strip():
            return raw_value.strip()

        if isinstance(raw_value, dict):
            for key in ("endpoint", "baseUrl", "base_url", "url"):
                candidate = raw_value.get(key)
                if isinstance(candidate, str) and candidate.strip():
                    return candidate.strip()
            self.logger.warning("%s endpoint dict missing url; falling back", name)
        elif raw_value not in (None, "") and not isinstance(raw_value, (str, dict)):
            self.logger.warning(
                "%s endpoint should be string or dict, got %s; falling back",
                name,
                type(raw_value).__name__,
            )

        env_val = os.getenv(env_var)
        if env_val and env_val.strip():
            return env_val.strip()
        return fallback

    async def _ensure_endpoints(self) -> None:
        if self._searxng_base_url and self._firecrawl_base_url:
            return

        endpoints = await self.config_service.get_config(
            config_node_constants.ENDPOINTS.value,
            default={},
            use_cache=True,
        ) or {}

        if isinstance(endpoints, str):
            try:
                endpoints = json.loads(endpoints)
            except Exception:
                self.logger.warning("Malformed endpoints config string; using defaults")
                endpoints = {}

        web_conf = endpoints.get("webSearch", {}) if isinstance(endpoints, dict) else {}
        self._searxng_base_url = self._normalize_endpoint(
            web_conf.get("searxng"),
            env_var="SEARXNG_BASE_URL",
            fallback="http://searxng:8080",
            name="Searxng",
        )
        self._firecrawl_base_url = self._normalize_endpoint(
            web_conf.get("firecrawl"),
            env_var="FIRECRAWL_BASE_URL",
            fallback="http://firecrawl:3002",
            name="Firecrawl",
        )

    @staticmethod
    def _coerce_positive_int(value: Any, fallback: int) -> int:
        try:
            parsed = int(value)
            return parsed if parsed > 0 else fallback
        except (TypeError, ValueError):
            return fallback

    async def search(
        self,
        query: str,
        *,
        max_results: int = 3,
        max_pages: int = 3,
        language: Optional[str] = None,
        include_content: bool = True,
        on_event: Optional[Callable[..., None]] = None,
    ) -> Dict[str, Any]:
        await self._ensure_endpoints()

        # Limits setzen
        safe_max_results = min(self._coerce_positive_int(max_results, 3), 10)
        safe_max_pages = min(self._coerce_positive_int(max_pages, safe_max_results), self._max_enrichment_pages)

        async with httpx.AsyncClient(timeout=self._timeout, verify=False) as client:
            search_tasks = []

            # Task 1: Firecrawl Search (Oft langsamer, aber bessere Qualität)
            if self._firecrawl_base_url:
                search_tasks.append(self._query_firecrawl(client, query=query, limit=safe_max_results, language=language))

            # Task 2: SearxNG (Schneller Fallback/Ergänzung)
            if self._searxng_base_url:
                search_tasks.append(self._query_searxng(client, query=query, limit=safe_max_results, language=language))

            # Parallel ausführen
            if not search_tasks:
                return {"query": query, "results": [], "fetched_at": datetime.utcnow().isoformat()}

            raw_results_list = await asyncio.gather(*search_tasks, return_exceptions=True)

            # Aggregation & Deduplication
            all_results = []
            seen_urls = set()

            for batch in raw_results_list:
                if isinstance(batch, list):
                    for item in batch:
                        # Normalize URL to avoid duplicates like http vs https or trailing slashes
                        u = item.get("url", "").rstrip("/")
                        if u and u not in seen_urls:
                            seen_urls.add(u)
                            all_results.append(item)

            # UPGRADE: Smart Rerank
            if all_results:
                all_results = self._smart_rerank(query, all_results)
                # Cut off nach Reranking
                all_results = all_results[:safe_max_results]

            # UPGRADE: Enrichment nur für die Top-Ergebnisse
            if include_content and all_results and self._firecrawl_base_url:
                # Wenn wir schon Firecrawl Search genutzt haben, haben wir vielleicht schon Content?
                # Falls nicht, fetchen wir Content für die besten Treffer.
                to_enrich = [r for r in all_results[:safe_max_pages] if not r.get("content")]

                if to_enrich:
                    self._emit_event(on_event, "web_search_enrich", f"Scraping {len(to_enrich)} pages")
                    await self._enrich_with_firecrawl(client, to_enrich)

        return {
            "query": query,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
            "results": all_results,
        }

    def _smart_rerank(self, query: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Verbesserter Reranker:
        - Bevorzugt exakte Phrasen
        - Bevorzugt Titel-Matches
        - Bestraft sehr kurze Snippets
        """
        query_lower = query.lower()
        terms = [t for t in query_lower.split() if len(t) >= 2] # Ignoriere 'is', 'the', etc.

        for res in results:
            score = 0.0
            title = (res.get("title") or "").lower()
            snippet = (res.get("snippet") or "").lower()

            # 1. Exact Phrase Match (Sehr starkes Signal)
            if query_lower in title:
                score += 10
            if query_lower in snippet:
                score += 5

            # 2. Keyword Matching
            for term in terms:
                if term in title:
                    score += 3
                if term in snippet:
                    score += 1

            # 3. Bonus für Firecrawl (besserer Parser)
            if res.get("engine") == "firecrawl":
                score += 0.5

            # 4. Penalty für nutzlose Snippets
            if len(snippet) < 20:
                score -= 2

            # Speichern für Sortierung (aber nicht im Output)
            res["_score"] = score

        # Sortieren und Score entfernen
        ranked = sorted(results, key=lambda x: x.get("_score", 0), reverse=True)
        for r in ranked:
            r.pop("_score", None)

        return ranked

    async def _query_firecrawl(
        self,
        client: httpx.AsyncClient,
        *,
        query: str,
        limit: int,
        language: Optional[str],
    ) -> List[Dict[str, Any]]:
        if not self._firecrawl_base_url:
            return []

        search_endpoint = urljoin(self._firecrawl_base_url.rstrip("/") + "/", "v1/search")

        # Firecrawl v2 search payload
        payload = {
            "query": query,
            "limit": limit,
            "lang": language or "en",
            "scrapeOptions": {
                "formats": ["markdown"]
            }
        }

        try:
            self.logger.debug(
                "Firecrawl search request prepared",
                extra={
                    "endpoint": search_endpoint,
                    "limit": limit,
                    "lang": language or "en",
                    "scrape_formats": payload["scrapeOptions"].get("formats"),
                },
            )
            response = await client.post(
                search_endpoint,
                json=payload,
                headers=self._get_headers(),
            )
            response.raise_for_status()
            data = response.json()
        except Exception as exc:
            self.logger.error("Firecrawl search failed: %s", exc)
            return []

        results = []
        # Firecrawl deployments can return different shapes. Prefer the most
        # common formats but fall back gracefully:
        # - { "success": true, "data": [...] }
        # - { "data": { "results": [...] } }
        # - { "results": [...] }
        raw_items: List[Dict[str, Any]] = []
        if isinstance(data, dict):
            top_level = data.get("data", data)
            if isinstance(top_level, list):
                raw_items = top_level
            elif isinstance(top_level, dict):
                inner = top_level.get("results") or top_level.get("data") or top_level.get("items")
                if isinstance(inner, list):
                    raw_items = inner

        if limit:
            raw_items = raw_items[:limit]

        self.logger.debug(
            "Firecrawl search returned %d items (pre-dedup)", len(raw_items)
        )

        for idx, item in enumerate(raw_items):
            url = item.get("url")
            title = item.get("title") or url or "Untitled"
            snippet = item.get("description") or ""
            # Do not trust search-level snippets/markdown as "full content".
            # We intentionally leave content empty here so that callers which
            # request include_content=True will fetch full page content via
            # the dedicated Firecrawl crawl API for the top N results.
            content = ""
            domain = ""
            if url:
                try:
                    domain = urlparse(url).netloc
                except Exception:
                    pass

            results.append({
                "id": idx + 1,
                "title": title,
                "url": url,
                "snippet": snippet,
                "content": content,
                "domain": domain,
                "engine": "firecrawl",
            })

        return results

    async def _query_searxng(
        self,
        client: httpx.AsyncClient,
        *,
        query: str,
        limit: int,
        language: Optional[str],
    ) -> List[Dict[str, Any]]:
        params = {
            "q": query,
            "format": "json",
            "language": language or "en",
            "safesearch": 1,
            # Let SearxNG select from its enabled engines (DuckDuckGo, Qwant,
            # Brave, etc.) instead of pinning to a small hard-coded set that
            # may be rate-limited or disabled.
        }

        search_endpoint = urljoin(self._searxng_base_url.rstrip("/") + "/", "search")

        try:
            response = await client.get(
                search_endpoint,
                params=params,
                headers={
                    **self._get_headers(),
                    "Referer": self._searxng_base_url,
                },
            )
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            status = getattr(exc, "response", None).status_code if hasattr(exc, "response") else None
            self.logger.error("Searxng search failed (status=%s): %s", status, exc)
            return []

        results = []
        raw_results = payload.get("results") or []
        for idx, item in enumerate(raw_results[:limit]):
            url = item.get("url") or item.get("href")
            title = item.get("title") or url or "Untitled result"
            snippet = item.get("content") or item.get("summary") or ""
            domain = ""
            if url:
                domain = urlparse(url).netloc

            results.append(
                {
                    "id": idx + 1,
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "content": "",
                    "domain": domain,
                    "engine": item.get("engine"),
                }
            )

        return results

    async def _enrich_with_firecrawl(self, client: httpx.AsyncClient, results: List[Dict[str, Any]]) -> None:
        """
        Fetches full page content using Firecrawl /scrape (fast) instead of /crawl (slow).
        """
        async def fetch_single(result) -> None:
            url = result.get("url")
            if not url:
                return

            try:
                # Strict timeout per page
                content = await asyncio.wait_for(
                    self._fetch_firecrawl_scrape(client, url),
                    timeout=self._enrichment_timeout_seconds
                )
                if content:
                    result["content"] = content
            except Exception:
                # Ignore errors (timeout, 404), keep the snippet
                pass

        # Parallel execution
        await asyncio.gather(*[fetch_single(r) for r in results])

    async def _fetch_firecrawl_content(
        self,
        client: httpx.AsyncClient,
        url: str,
    ) -> Optional[str]:
        payload = {"url": url}
        candidate_paths = ["v1/crawl"]

        for path in candidate_paths:
            crawl_endpoint = urljoin(
                self._firecrawl_base_url.rstrip("/") + "/",
                path,
            )
            try:
                response = await client.post(crawl_endpoint, json=payload)
                if response.status_code == httpx.codes.NOT_FOUND:
                    continue
                response.raise_for_status()
                data = response.json()

                # Firecrawl can return different shapes depending on version /
                # endpoint. Try to robustly extract page content.
                def extract_from_container(container: Any) -> Optional[str]:
                    if isinstance(container, str):
                        return container or None
                    if not isinstance(container, dict):
                        return None

                    # 1) Direct content-style keys at this level
                    for key in ("content", "markdown", "text", "html_text", "rawHtml", "raw_html"):
                        value = container.get(key)
                        if isinstance(value, str) and value.strip():
                            return value.strip()

                    # 2) Nested "data" object or list
                    nested = container.get("data")
                    if isinstance(nested, dict):
                        direct = extract_from_container(nested)
                        if direct:
                            return direct
                    elif isinstance(nested, list):
                        parts = []
                        for item in nested:
                            if isinstance(item, dict):
                                val = extract_from_container(item)
                                if val:
                                    parts.append(val)
                        if parts:
                            return "\n\n-----\n\n".join(parts)

                    # 3) Common collection keys used by crawling APIs
                    for coll_key in ("documents", "pages", "results", "items"):
                        coll = container.get(coll_key)
                        if isinstance(coll, list):
                            parts = []
                            for item in coll:
                                if isinstance(item, dict):
                                    val = extract_from_container(item)
                                    if val:
                                        parts.append(val)
                            if parts:
                                return "\n\n-----\n\n".join(parts)

                    return None

                content = extract_from_container(data)
                if content:
                    return content

                # Some Firecrawl deployments return an async "job" descriptor
                # like: {"success": true, "id": "...", "url": "https://.../v1/crawl/<id>"}.
                # In that case, follow the job URL and poll a few times for
                # the final crawled content. If we still don't get any real
                # page content, we gracefully fall back to SearxNG snippets.
                job_url = None
                if isinstance(data, dict) and data.get("success"):
                    job_id = data.get("id")
                    raw_job_url = data.get("url")

                    if job_id and self._firecrawl_base_url:
                        job_path = f"v1/crawl/{job_id}"
                        if isinstance(raw_job_url, str):
                            try:
                                parsed = urlparse(raw_job_url)
                                if parsed.path:
                                    job_path = parsed.path.lstrip("/")
                            except Exception:
                                pass

                        job_url = urljoin(
                            self._firecrawl_base_url.rstrip("/") + "/",
                            job_path,
                        )

                if job_url:
                    for attempt in range(5):
                        try:
                            await asyncio.sleep(0.6)
                            job_resp = await client.get(job_url)
                            job_resp.raise_for_status()
                            job_data = job_resp.json()

                            content = extract_from_container(job_data)
                            if content:
                                return content

                            # If the job has a status field and it's terminal,
                            # stop polling early.
                            if isinstance(job_data, dict):
                                status = job_data.get("status") or job_data.get("crawlStatus")
                                if isinstance(status, str) and status.lower() in ("failed", "error", "done", "completed"):
                                    break
                        except Exception:
                            break

                # If we reach this point, Firecrawl did not return extractable
                # page content (only job/status metadata). Log once and fall
                # back to SearxNG snippets instead of surfacing opaque JSON.
            except Exception:
                pass
        return None

    async def _fetch_firecrawl_scrape(self, client: httpx.AsyncClient, url: str) -> Optional[str]:
        """
        UPGRADE: Uses /v1/scrape endpoint. Synchronous and usually faster than crawl.
        """
        if not self._firecrawl_base_url:
            return None

        # Versuche erst /v1/scrape (Schnell)
        endpoint = urljoin(self._firecrawl_base_url.rstrip("/") + "/", "v1/scrape")

        payload = {
            "url": url,
            "formats": ["markdown"],
            # Wichtig: Keine Sub-Pages, keine Screenshots -> Maximale Geschwindigkeit
            "onlyMainContent": True,
            "timeout": int(self._enrichment_timeout_seconds * 1000)
        }
        try:
            resp = await client.post(endpoint, json=payload, headers=self._get_headers())

            # Fallback: Wenn Scrape 404 gibt (manche Self-Hosted Versionen haben das nicht),
            # probieren wir den alten Weg, aber OHNE Polling
            if resp.status_code == 404:
                 return await self._fetch_firecrawl_crawl_no_polling(client, url)

            resp.raise_for_status()
            data = resp.json()

            # Extract Markdown
            return data.get("data", {}).get("markdown") or data.get("markdown")

        except Exception as e:
            self.logger.debug(f"Scrape failed for {url}: {e}")
            return None

    async def _fetch_firecrawl_crawl_no_polling(self, client, url):
        """Fallback für ältere Firecrawl Versionen, aber ohne Warten."""
        endpoint = urljoin(self._firecrawl_base_url.rstrip("/") + "/", "v1/crawl")
        try:
            resp = await client.post(endpoint, json={"url": url}, headers=self._get_headers())
            data = resp.json()

            # Wenn es ein Async Job ist ("success": True, "id": ...), brechen wir ab!
            # Wir warten nicht 10 Sekunden auf einen Crawl im Chat-Kontext.
            if data.get("success") and data.get("id"):
                return None

            # Vielleicht kam der Content direkt zurück?
            return self._extract_content_legacy(data)
        except Exception:
            return None

    def _extract_content_legacy(self, data: Any) -> Optional[str]:
        # Deine alte Logic zum Extrahieren von Content aus verwirrenden JSONs
        if isinstance(data, dict):
            for key in ["content", "markdown", "text", "html_text"]:
                if val := data.get(key):
                    return val
            if nested := data.get("data"):
                if isinstance(nested, list) and len(nested) > 0:
                    return nested[0].get("markdown")
        return None

    @staticmethod
    def to_documents(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        documents = []
        for idx, result in enumerate(results):
            content = result.get("content") or result.get("snippet") or ""
            if not content:
                continue

            virtual_record_id = f"web-{idx + 1}"
            metadata = {
                "recordId": result.get("url"),
                "recordName": result.get("title"),
                "recordType": "web",
                "origin": "web",
                "webUrl": result.get("url"),
                "domain": result.get("domain"),
            }
            documents.append(
                {
                    "content": content,
                    "virtual_record_id": virtual_record_id,
                    "block_index": 0,
                    "metadata": metadata,
                    "citationType": "web|page",
                }
            )
        return documents

    @staticmethod
    def to_event_payload(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        payload = []
        for result in results:
            payload.append(
                {
                    "id": result.get("id"),
                    "title": result.get("title"),
                    "url": result.get("url"),
                    "snippet": result.get("snippet"),
                    "domain": result.get("domain"),
                }
            )
        return payload


