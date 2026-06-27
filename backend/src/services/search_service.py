"""Full-text search service backed by Meilisearch (typo-tolerant ranking)."""
from __future__ import annotations

from src.core.logging import get_logger
from src.enums import TariffType
from src.integrations.search_index import MeiliIndex
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository

logger = get_logger(__name__)


def _tariff(item, tier: TariffType) -> float | None:
    for t in item.tariffs:
        if t.tariff_type == tier:
            return float(t.amount)
    return None


class SearchService:
    """Reindexes price items into Meilisearch and runs full-text queries."""

    def __init__(
        self,
        meili: MeiliIndex,
        prices: PriceRepository,
        partners: PartnerRepository,
        catalog: CatalogRepository,
    ):
        self.meili = meili
        self.prices = prices
        self.partners = partners
        self.catalog = catalog

    async def reindex(self) -> int:
        """Rebuild the Meilisearch index from all active price items. Returns doc count."""
        if not self.meili.is_configured:
            raise ValueError("Meilisearch is not configured (set MEILI_URL)")
        await self.meili.ensure_setup()
        await self.meili.clear()

        partner_map = {p.id: p for p in await self.partners.list_all()}
        service_map = {s.id: s for s in await self.catalog.list_services(limit=10000)}
        items = await self.prices.list_all_active_items()

        docs = []
        for it in items:
            p = partner_map.get(it.partner_id)
            s = service_map.get(it.service_id) if it.service_id else None
            docs.append({
                "id": it.id,
                "service_name_raw": it.service_name_raw,
                "service_name": s.name if s else None,
                "service_id": it.service_id,
                "category": s.category if s else None,
                "partner_id": it.partner_id,
                "partner_name": p.name if p else None,
                "city": p.city if p else None,
                "resident_price": _tariff(it, TariffType.resident),
                "nonresident_price": _tariff(it, TariffType.far_abroad) or _tariff(it, TariffType.cis),
                "is_anomaly": it.is_anomaly,
                "effective_date": str(it.effective_date) if it.effective_date else None,
            })
        await self.meili.add_documents(docs)
        logger.info("search_reindexed", docs=len(docs))
        return len(docs)

    async def search(self, query: str, limit: int = 20) -> list[dict]:
        """Full-text search over indexed price items."""
        if not self.meili.is_configured:
            raise ValueError("Meilisearch is not configured (set MEILI_URL)")
        return await self.meili.search(query, limit=limit)
