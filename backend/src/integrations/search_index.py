"""Meilisearch full-text index for price items. Optional — enabled when MEILI_URL is set."""
from __future__ import annotations

from typing import Any

import httpx

from src.core.logging import get_logger

logger = get_logger(__name__)

_INDEX = "price_items"


class MeiliIndex:
    """Thin async Meilisearch client over the REST API. NoOp-friendly when unconfigured."""

    def __init__(self, url: str, key: str):
        self.url = url.rstrip("/")
        self.key = key

    @property
    def is_configured(self) -> bool:
        """True when a Meilisearch URL is set."""
        return bool(self.url)

    def _headers(self) -> dict[str, str]:
        h = {"Content-Type": "application/json"}
        if self.key:
            h["Authorization"] = f"Bearer {self.key}"
        return h

    async def health(self) -> bool:
        """Return True if the Meilisearch server is reachable and available."""
        if not self.is_configured:
            return False
        try:
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{self.url}/health")
                return r.status_code == 200
        except httpx.HTTPError:
            return False

    async def ensure_setup(self) -> None:
        """Create the index (primary key 'id') and configure searchable/filterable fields."""
        async with httpx.AsyncClient(timeout=15, headers=self._headers()) as c:
            await c.post(f"{self.url}/indexes", json={"uid": _INDEX, "primaryKey": "id"})
            await c.patch(
                f"{self.url}/indexes/{_INDEX}/settings",
                json={
                    "searchableAttributes": ["service_name_raw", "service_name", "category", "partner_name"],
                    "filterableAttributes": ["city", "category", "is_anomaly", "service_id", "partner_id"],
                    "sortableAttributes": ["resident_price"],
                    # typo tolerance is on by default — that is the whole point vs trigram
                },
            )
        logger.info("meili_index_ready", index=_INDEX)

    async def add_documents(self, docs: list[dict[str, Any]]) -> None:
        """Upsert documents into the index."""
        if not docs:
            return
        async with httpx.AsyncClient(timeout=30, headers=self._headers()) as c:
            r = await c.post(f"{self.url}/indexes/{_INDEX}/documents", json=docs)
            r.raise_for_status()
        logger.info("meili_documents_added", count=len(docs))

    async def clear(self) -> None:
        """Delete all documents in the index."""
        async with httpx.AsyncClient(timeout=15, headers=self._headers()) as c:
            await c.delete(f"{self.url}/indexes/{_INDEX}/documents")

    async def search(self, query: str, limit: int = 20, filters: str | None = None) -> list[dict[str, Any]]:
        """Run a full-text search; returns the raw hit documents."""
        payload: dict[str, Any] = {"q": query, "limit": limit}
        if filters:
            payload["filter"] = filters
        async with httpx.AsyncClient(timeout=10, headers=self._headers()) as c:
            r = await c.post(f"{self.url}/indexes/{_INDEX}/search", json=payload)
            r.raise_for_status()
            return r.json().get("hits", [])
