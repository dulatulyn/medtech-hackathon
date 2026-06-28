"""Repository for price documents, items, and tariffs."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.enums import Currency, FileFormat, MatchMethod, ParseStatus, TariffType
from src.models.pricing import PriceDocument, PriceItem, PriceTariff


class PriceRepository:
    """Data access for price documents and their items/tariffs."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_document(
        self, partner_id: str, file_name: str, file_format: FileFormat, object_key: str,
        effective_date: date | None = None,
    ) -> PriceDocument:
        """Insert a new price document in pending state."""
        doc = PriceDocument(
            partner_id=partner_id, file_name=file_name, file_format=file_format,
            object_key=object_key, effective_date=effective_date, parse_status=ParseStatus.pending,
        )
        self.session.add(doc)
        await self.session.flush()
        return doc

    async def add_item(
        self, doc_id: str, partner_id: str, service_name_raw: str,
        service_code_source: str | None = None, provenance: dict | None = None,
        effective_date: date | None = None,
    ) -> PriceItem:
        """Insert a price item for a document."""
        item = PriceItem(
            doc_id=doc_id, partner_id=partner_id, service_name_raw=service_name_raw,
            service_code_source=service_code_source, provenance=provenance,
            effective_date=effective_date,
        )
        self.session.add(item)
        await self.session.flush()
        return item

    async def add_tariff(
        self, item_id: str, amount: Decimal, tariff_type: TariffType = TariffType.default,
        currency: Currency = Currency.KZT, original_amount: Decimal | None = None,
    ) -> PriceTariff:
        """Attach a tariff amount to a price item (amount in KZT; original kept if converted)."""
        tariff = PriceTariff(
            item_id=item_id, amount=amount, tariff_type=tariff_type,
            currency=currency, original_amount=original_amount,
        )
        self.session.add(tariff)
        await self.session.flush()
        return tariff

    async def get_document(self, doc_id: str) -> PriceDocument | None:
        """Return a price document by id."""
        return await self.session.get(PriceDocument, doc_id)

    async def list_documents(self) -> list[PriceDocument]:
        """Return all price documents, newest first."""
        result = await self.session.scalars(
            select(PriceDocument).order_by(PriceDocument.created_at.desc())
        )
        return list(result)

    async def items_for_document(self, doc_id: str) -> list[PriceItem]:
        """Return all items belonging to a document."""
        result = await self.session.scalars(select(PriceItem).where(PriceItem.doc_id == doc_id))
        return list(result)

    async def list_items_for_doc(self, doc_id: str) -> list[PriceItem]:
        """Return all items for a document with tariffs loaded."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.doc_id == doc_id)
        )
        return list(result)

    async def list_unmatched_items_for_doc(self, doc_id: str) -> list[PriceItem]:
        """Return items in a document that have no service_id yet."""
        result = await self.session.scalars(
            select(PriceItem).where(
                PriceItem.doc_id == doc_id,
                PriceItem.service_id.is_(None),
            )
        )
        return list(result)

    async def update_item_match(
        self, item_id: str, service_id: str, method: MatchMethod, confidence: float | None = None
    ) -> None:
        """Set service_id, match_method, and confidence on a price item."""
        await self.session.execute(
            update(PriceItem)
            .where(PriceItem.id == item_id)
            .values(service_id=service_id, match_method=method, match_confidence=confidence)
        )

    async def list_active_items_for_partner_service(
        self, partner_id: str, service_id: str
    ) -> list[PriceItem]:
        """Return active items for a given partner+service pair, with tariffs."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(
                PriceItem.partner_id == partner_id,
                PriceItem.service_id == service_id,
                PriceItem.is_active.is_(True),
            )
        )
        return list(result)

    async def deactivate_item(self, item_id: str, superseded_by: str) -> None:
        """Mark an item inactive and record what superseded it."""
        await self.session.execute(
            update(PriceItem)
            .where(PriceItem.id == item_id)
            .values(is_active=False, superseded_by=superseded_by)
        )

    async def set_anomaly(self, item_id: str, reason: str) -> None:
        """Flag an item as anomalous with a reason."""
        await self.session.execute(
            update(PriceItem)
            .where(PriceItem.id == item_id)
            .values(is_anomaly=True, anomaly_reason=reason)
        )

    async def list_active_items_for_service(self, service_id: str) -> list[PriceItem]:
        """Return all active items for a service, with tariffs."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.service_id == service_id, PriceItem.is_active.is_(True))
            .order_by(PriceItem.partner_id)
        )
        return list(result)

    async def list_active_items_for_partner(self, partner_id: str) -> list[PriceItem]:
        """Return all active items for a partner, with tariffs."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.partner_id == partner_id, PriceItem.is_active.is_(True))
            .order_by(PriceItem.service_name_raw)
        )
        return list(result)

    async def list_all_active_items(self) -> list[PriceItem]:
        """Return every active price item with tariffs (for full-text reindexing)."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.is_active.is_(True))
        )
        return list(result)

    async def list_anomalies(self, limit: int = 200) -> list[PriceItem]:
        """Return active items flagged as anomalies, with tariffs."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.is_anomaly.is_(True), PriceItem.is_active.is_(True))
            .order_by(PriceItem.created_at.desc())
            .limit(limit)
        )
        return list(result)

    async def list_unmatched(self, limit: int = 100, offset: int = 0) -> list[PriceItem]:
        """Return items with no service_id, with tariffs."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.service_id.is_(None))
            .order_by(PriceItem.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result)

    async def count_unmatched(self) -> int:
        """Count items with no service_id."""
        return await self.session.scalar(
            select(func.count()).select_from(PriceItem).where(PriceItem.service_id.is_(None))
        ) or 0

    async def get_item_with_tariffs(self, item_id: str) -> PriceItem | None:
        """Return a single item with its tariffs loaded."""
        return await self.session.scalar(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.id == item_id)
        )

    async def search_items(self, query: str, limit: int = 20) -> list[PriceItem]:
        """Full-text + trigram search across service_name_raw, with tariffs."""
        result = await self.session.scalars(
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(
                PriceItem.is_active.is_(True),
                func.similarity(PriceItem.service_name_raw, query) > 0.05,
            )
            .order_by(func.similarity(PriceItem.service_name_raw, query).desc())
            .limit(limit)
        )
        return list(result)

    async def get_price_history(
        self, service_id: str, partner_id: str | None = None
    ) -> list[PriceItem]:
        """Return all items (active + archived) for a service, newest first."""
        stmt = (
            select(PriceItem)
            .options(selectinload(PriceItem.tariffs))
            .where(PriceItem.service_id == service_id)
        )
        if partner_id:
            stmt = stmt.where(PriceItem.partner_id == partner_id)
        stmt = stmt.order_by(PriceItem.created_at.desc())
        result = await self.session.scalars(stmt)
        return list(result)

    async def count_by_status(self) -> dict[str, int]:
        """Count documents grouped by parse_status."""
        rows = await self.session.execute(
            select(PriceDocument.parse_status, func.count().label("n"))
            .group_by(PriceDocument.parse_status)
        )
        return {str(row.parse_status.value): row.n for row in rows}

    async def count_anomalies(self) -> int:
        """Count price items flagged as anomalous."""
        return await self.session.scalar(
            select(func.count()).select_from(PriceItem).where(PriceItem.is_anomaly.is_(True))
        ) or 0

    async def get_match_stats(self) -> dict[str, int]:
        """Return item counts grouped by match_method."""
        rows = await self.session.execute(
            select(PriceItem.match_method, func.count().label("n"))
            .group_by(PriceItem.match_method)
        )
        return {str(row.match_method.value): row.n for row in rows}

    async def count_total_items(self) -> int:
        """Count all price items."""
        return await self.session.scalar(
            select(func.count()).select_from(PriceItem)
        ) or 0

    async def find_unmatched_by_name(self, service_name_raw: str) -> list[PriceItem]:
        """Find unmatched items with the same raw service name for twin matching."""
        result = await self.session.scalars(
            select(PriceItem).where(
                PriceItem.service_id.is_(None),
                PriceItem.service_name_raw == service_name_raw,
            )
        )
        return list(result)

    async def set_verified(self, item_id: str, note: str | None = None) -> None:
        """Mark an item as operator-verified."""
        values: dict = {"is_verified": True}
        if note is not None:
            values["verification_note"] = note
        await self.session.execute(
            update(PriceItem).where(PriceItem.id == item_id).values(**values)
        )
