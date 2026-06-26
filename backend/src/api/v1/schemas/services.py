"""Pydantic schemas for service and price endpoints."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict


class TariffOut(BaseModel):
    """One price tier for a service item."""

    model_config = ConfigDict(from_attributes=True)

    tariff_type: str
    amount: float
    currency: str


class ServiceOut(BaseModel):
    """A canonical catalog service."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    category: str | None
    icd_code: str | None
    is_active: bool


class ServiceListOut(BaseModel):
    """Paginated list of catalog services."""

    items: list[ServiceOut]
    total: int


class ServicePartnersItemOut(BaseModel):
    """Summary of one partner's prices for a service."""

    partner_id: str
    effective_date: date | None
    tariffs: list[TariffOut]
    is_anomaly: bool
    provenance: dict | None


class ServicePartnersOut(BaseModel):
    """All partners providing a service, with their current prices."""

    service_id: str
    partners: list[ServicePartnersItemOut]


class PriceHistoryItemOut(BaseModel):
    """One price record in a service's history."""

    item_id: str
    partner_id: str
    effective_date: date | None
    tariffs: list[TariffOut]
    is_active: bool
    is_anomaly: bool
    anomaly_reason: str | None
    created_at: str


class PriceComparePartnerOut(BaseModel):
    """One partner's current prices for a service, for cross-partner comparison."""

    partner_id: str
    tariffs: dict[str, float]
    effective_date: date | None
    is_anomaly: bool
