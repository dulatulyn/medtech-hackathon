"""Repository for catalog services and synonyms."""
from __future__ import annotations

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import SynonymSource
from src.models.catalog import Service, ServiceSynonym


class CatalogRepository:
    """Data access for the reference services dictionary."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_service(self, name: str, category: str | None = None, icd_code: str | None = None) -> Service:
        """Insert a new catalog service."""
        service = Service(name=name, category=category, icd_code=icd_code)
        self.session.add(service)
        await self.session.flush()
        return service

    async def add_synonym(self, service_id: str, text_: str, source: SynonymSource = SynonymSource.dict) -> ServiceSynonym:
        """Attach a synonym to a service."""
        syn = ServiceSynonym(service_id=service_id, text=text_, source=source)
        self.session.add(syn)
        await self.session.flush()
        return syn

    async def get_by_id(self, service_id: str) -> Service | None:
        """Return a service by id."""
        return await self.session.get(Service, service_id)

    async def get_by_code(self, code: str) -> Service | None:
        """Return a service whose icd_code matches the given code."""
        return await self.session.scalar(select(Service).where(Service.icd_code == code))

    async def get_by_name(self, name: str) -> Service | None:
        """Return a service by case-insensitive exact name."""
        return await self.session.scalar(
            select(Service).where(func.lower(Service.name) == name.lower())
        )

    async def get_synonym_texts(self, service_id: str) -> set[str]:
        """Return the set of synonym texts attached to a service."""
        rows = await self.session.scalars(
            select(ServiceSynonym.text).where(ServiceSynonym.service_id == service_id)
        )
        return set(rows)

    async def find_by_synonym(self, text_: str) -> Service | None:
        """Return a service that has a synonym exactly matching text_."""
        row = await self.session.scalar(
            select(ServiceSynonym).where(
                func.lower(ServiceSynonym.text) == text_.lower()
            )
        )
        if row is None:
            return None
        return await self.session.get(Service, row.service_id)

    async def fuzzy_search(self, query: str, limit: int = 10) -> list[tuple[Service, float]]:
        """Return services ordered by pg_trgm similarity; each entry is (service, score)."""
        stmt = (
            select(Service, func.similarity(Service.name, query).label("score"))
            .where(func.similarity(Service.name, query) > 0.1)
            .order_by(func.similarity(Service.name, query).desc())
            .limit(limit)
        )
        rows = await self.session.execute(stmt)
        return [(row.Service, float(row.score)) for row in rows]

    async def list_services(
        self,
        category: str | None = None,
        q: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Service]:
        """Return services, optionally filtered by category or name substring."""
        stmt = select(Service).where(Service.is_active.is_(True))
        if category:
            stmt = stmt.where(Service.category == category)
        if q:
            stmt = stmt.where(func.similarity(Service.name, q) > 0.1).order_by(
                func.similarity(Service.name, q).desc()
            )
        else:
            stmt = stmt.order_by(Service.name)
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.scalars(stmt)
        return list(result)

    async def count_services(self, category: str | None = None) -> int:
        """Count active services, optionally filtered by category."""
        stmt = select(func.count()).select_from(Service).where(Service.is_active.is_(True))
        if category:
            stmt = stmt.where(Service.category == category)
        return await self.session.scalar(stmt) or 0

    async def get_partners_for_service(self, service_id: str) -> list[str]:
        """Return distinct partner_ids that have active items for this service."""
        from src.models.pricing import PriceItem
        result = await self.session.scalars(
            select(PriceItem.partner_id)
            .where(PriceItem.service_id == service_id, PriceItem.is_active.is_(True))
            .distinct()
        )
        return list(result)
