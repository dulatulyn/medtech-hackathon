"""Repository for catalog services and synonyms."""
from __future__ import annotations

from sqlalchemy import select
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

    async def add_synonym(self, service_id: str, text: str, source: SynonymSource = SynonymSource.dict) -> ServiceSynonym:
        """Attach a synonym to a service."""
        syn = ServiceSynonym(service_id=service_id, text=text, source=source)
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
        """Return a service by exact name."""
        return await self.session.scalar(select(Service).where(Service.name == name))

    async def get_synonym_texts(self, service_id: str) -> set[str]:
        """Return the set of synonym texts attached to a service."""
        rows = await self.session.scalars(
            select(ServiceSynonym.text).where(ServiceSynonym.service_id == service_id)
        )
        return set(rows)
