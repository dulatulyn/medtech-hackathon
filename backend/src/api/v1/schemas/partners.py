"""Pydantic schemas for partner and normalization endpoints."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict

from src.api.v1.schemas.services import TariffOut


class PartnerOut(BaseModel):
    """A partner clinic."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    city: str | None
    is_active: bool
    bin: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None


class PartnerListOut(BaseModel):
    """List of partners."""

    items: list[PartnerOut]
    total: int


class PartnerServiceItemOut(BaseModel):
    """One service line offered by a partner."""

    item_id: str
    service_id: str | None
    service_name_raw: str
    effective_date: date | None
    tariffs: list[TariffOut]
    is_anomaly: bool
    match_method: str
    match_confidence: float | None


class PartnerServicesOut(BaseModel):
    """All services offered by a partner."""

    partner_id: str
    items: list[PartnerServiceItemOut]


class UnmatchedItemOut(BaseModel):
    """A price item pending normalization."""

    item_id: str
    partner_id: str
    service_name_raw: str
    service_code_source: str | None
    provenance: dict | None
    tariffs: list[TariffOut]


class UnmatchedListOut(BaseModel):
    """Paginated list of unmatched items."""

    items: list[UnmatchedItemOut]
    total: int
    limit: int
    offset: int


class MatchIn(BaseModel):
    """Request body for the manual match endpoint."""

    item_id: str
    service_id: str | None = None
    new_service_name: str | None = None
    new_service_category: str | None = None
    note: str | None = None


class MatchOut(BaseModel):
    """Response for a successful manual match."""

    item_id: str
    service_id: str
    method: str
    synonyms_added: int
    twins_rematched: int


class SearchResultItemOut(BaseModel):
    """One search result entry."""

    item_id: str
    partner_id: str
    service_name_raw: str
    service_id: str | None
    effective_date: date | None
    tariffs: list[TariffOut]
    is_anomaly: bool


class SearchOut(BaseModel):
    """Search results."""

    query: str
    items: list[SearchResultItemOut]
    total: int
