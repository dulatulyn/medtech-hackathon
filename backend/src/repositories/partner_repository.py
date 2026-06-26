"""Repository for partner clinics."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.partner import Partner


class PartnerRepository:
    """Data access for partners."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, name: str, city: str | None = None, bin: str | None = None) -> Partner:
        """Insert a new partner."""
        partner = Partner(name=name, city=city, bin=bin)
        self.session.add(partner)
        await self.session.flush()
        return partner

    async def get_by_id(self, partner_id: str) -> Partner | None:
        """Return a partner by id."""
        return await self.session.get(Partner, partner_id)

    async def get_by_name(self, name: str) -> Partner | None:
        """Return a partner by exact name."""
        return await self.session.scalar(select(Partner).where(Partner.name == name))

    async def get_by_bin(self, bin: str) -> Partner | None:
        """Return a partner by BIN, used for deduplication."""
        return await self.session.scalar(select(Partner).where(Partner.bin == bin))

    async def list_all(self, city: str | None = None, is_active: bool | None = None) -> list[Partner]:
        """Return all partners, optionally filtered by city or active status."""
        stmt = select(Partner)
        if city:
            stmt = stmt.where(Partner.city == city)
        if is_active is not None:
            stmt = stmt.where(Partner.is_active.is_(is_active))
        stmt = stmt.order_by(Partner.name)
        result = await self.session.scalars(stmt)
        return list(result)

    async def count_active(self) -> int:
        """Return count of active partners."""
        from sqlalchemy import func
        return await self.session.scalar(
            select(func.count()).select_from(Partner).where(Partner.is_active.is_(True))
        ) or 0
