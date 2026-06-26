"""Normalization service: runs the cascade on all unmatched items of a document."""
from __future__ import annotations

from src.core.logging import get_logger
from src.dtos.normalization_dto import NormalizationResultDTO
from src.normalization.cascade import match_service
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.price_repository import PriceRepository

logger = get_logger(__name__)


class NormalizationService:
    """Normalizes all unmatched price items in a document."""

    def __init__(self, catalog_repo: CatalogRepository, price_repo: PriceRepository):
        self.catalog = catalog_repo
        self.prices = price_repo

    async def normalize_document(self, doc_id: str) -> NormalizationResultDTO:
        """Run the cascade on all unmatched items of a document."""
        items = await self.prices.list_unmatched_items_for_doc(doc_id)
        matched = 0
        unmatched = 0
        for item in items:
            result = await match_service(item.service_name_raw, item.service_code_source, self.catalog)
            if result:
                await self.prices.update_item_match(
                    item.id, result.service_id, result.method, result.confidence
                )
                matched += 1
                logger.info("item_matched", item_id=item.id, method=result.method.value)
            else:
                unmatched += 1
                logger.info("item_unmatched", item_id=item.id)
        return NormalizationResultDTO(
            doc_id=doc_id,
            matched=matched,
            unmatched=unmatched,
            auto_matched=matched,
            needs_review=unmatched,
        )

    async def normalize_pending(self) -> dict[str, NormalizationResultDTO]:
        """Normalize all unmatched items across all parsed documents."""
        from src.enums import ParseStatus
        results: dict[str, NormalizationResultDTO] = {}
        docs = await self.prices.list_documents()
        for doc in docs:
            if doc.parse_status not in (ParseStatus.done, ParseStatus.needs_review):
                continue
            result = await self.normalize_document(doc.id)
            results[doc.id] = result
            logger.info("document_normalized", doc_id=doc.id, matched=result.matched, unmatched=result.unmatched)
        return results
