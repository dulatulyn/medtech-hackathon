"""Parse service: load a stored document, extract rows, persist items and tariffs."""
from __future__ import annotations

from src.core.logging import get_logger
from src.enums import ParseStatus
from src.integrations.storage import ObjectStorage
from src.parsers.dispatch import parse_bytes
from src.repositories.price_repository import PriceRepository

logger = get_logger(__name__)

_SCAN_REQUIRES_OCR = "scan_requires_ocr"


class ParseService:
    """Turns a pending price document into persisted price items + tariffs."""

    def __init__(self, prices: PriceRepository, storage: ObjectStorage):
        self.prices = prices
        self.storage = storage

    async def parse_document(self, doc_id: str) -> int:
        """Parse one document; persist rows; set status; return row count."""
        doc = await self.prices.get_document(doc_id)
        if doc is None:
            raise ValueError("document not found")

        doc.parse_status = ParseStatus.processing
        try:
            data = await self.storage.get(doc.object_key)
            result = parse_bytes(data, doc.file_format)

            if _SCAN_REQUIRES_OCR in result.warnings and not result.rows:
                doc.parse_status = ParseStatus.needs_review
                doc.parse_log = "needs_ocr: no Azure key configured; mark for manual OCR"
                logger.info("document_needs_ocr", doc_id=doc.id)
                return 0

            for raw in result.rows:
                item = await self.prices.add_item(
                    doc_id=doc.id,
                    partner_id=doc.partner_id,
                    service_name_raw=raw.service_name_raw,
                    service_code_source=raw.service_code_source,
                    provenance=raw.provenance,
                    effective_date=doc.effective_date,
                )
                for tariff in raw.tariffs:
                    await self.prices.add_tariff(item.id, tariff.amount, tariff.tariff_type)

            doc.parse_status = ParseStatus.done if result.rows else ParseStatus.needs_review
            doc.parse_log = "; ".join(result.warnings) if result.warnings else f"{len(result.rows)} rows"
            logger.info("document_parsed", doc_id=doc.id, rows=len(result.rows), status=doc.parse_status.value)
            return len(result.rows)
        except Exception as exc:  # noqa: BLE001 - record parse failure on the document
            doc.parse_status = ParseStatus.error
            doc.parse_log = f"{type(exc).__name__}: {exc}"
            logger.error("document_parse_failed", doc_id=doc.id, error=str(exc))
            raise

    async def parse_pending(self) -> dict[str, int]:
        """Parse all pending documents; return {doc_id: row_count}. Failures are skipped."""
        counts: dict[str, int] = {}
        for doc in await self.prices.list_documents():
            if doc.parse_status != ParseStatus.pending:
                continue
            try:
                counts[doc.id] = await self.parse_document(doc.id)
            except Exception:  # noqa: BLE001 - already logged; keep processing others
                counts[doc.id] = -1
        return counts
