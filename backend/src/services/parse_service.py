"""Parse service: load a stored document, extract rows, persist items and tariffs."""
from __future__ import annotations

from src.core.logging import get_logger
from src.enums import ParseStatus
from src.integrations.ocr import OcrNotConfiguredError, OcrProvider
from src.integrations.storage import ObjectStorage
from src.parsers.dispatch import parse_bytes
from src.repositories.price_repository import PriceRepository

logger = get_logger(__name__)

_SCAN_REQUIRES_OCR = "scan_requires_ocr"


class ParseService:
    """Turns a pending price document into persisted price items + tariffs."""

    def __init__(self, prices: PriceRepository, storage: ObjectStorage, ocr: OcrProvider):
        self.prices = prices
        self.storage = storage
        self.ocr = ocr

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
                result = await self._try_ocr(doc, data, result)
                if not result.rows:
                    doc.parse_status = ParseStatus.needs_review
                    doc.parse_log = doc.parse_log or "needs_ocr: no OCR provider configured"
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

    async def _try_ocr(self, doc, data: bytes, result):
        """Route a text-less scan through the OCR provider when one is configured.

        Returns the (possibly unchanged) ParseResult. When OCR yields text but the
        table layout cannot yet be reconstructed, the document stays needs_review
        with an explanatory parse_log — the provider is the pluggable seam.
        """
        if not self.ocr.is_configured:
            doc.parse_log = "needs_ocr: no OCR provider configured; mark for manual OCR"
            return result
        try:
            text = await self.ocr.extract_text(data)
        except (OcrNotConfiguredError, NotImplementedError) as exc:
            doc.parse_log = f"ocr_unavailable: {type(exc).__name__}"
            logger.info("ocr_unavailable", doc_id=doc.id, error=str(exc))
            return result
        if text.strip():
            doc.parse_log = "ocr_text_extracted: table reconstruction pending manual review"
            logger.info("ocr_text_extracted", doc_id=doc.id, chars=len(text))
        else:
            doc.parse_log = "ocr_empty: provider returned no text"
        return result

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
