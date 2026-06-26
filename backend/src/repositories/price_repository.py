"""Repository for price documents, items, and tariffs."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import Currency, FileFormat, ParseStatus, TariffType
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
    ) -> PriceItem:
        """Insert a price item for a document."""
        item = PriceItem(
            doc_id=doc_id, partner_id=partner_id, service_name_raw=service_name_raw,
            service_code_source=service_code_source, provenance=provenance,
        )
        self.session.add(item)
        await self.session.flush()
        return item

    async def add_tariff(
        self, item_id: str, amount: Decimal, tariff_type: TariffType = TariffType.default,
        currency: Currency = Currency.KZT,
    ) -> PriceTariff:
        """Attach a tariff amount to a price item."""
        tariff = PriceTariff(item_id=item_id, amount=amount, tariff_type=tariff_type, currency=currency)
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
