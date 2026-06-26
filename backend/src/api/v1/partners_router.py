"""Partners endpoints: list partners and their services."""
from __future__ import annotations

from typing import Optional

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Query

from src.api.exceptions.exception_handlers import handle_service_errors
from src.api.v1.schemas.partners import (
    PartnerListOut,
    PartnerOut,
    PartnerServiceItemOut,
    PartnerServicesOut,
)
from src.api.v1.schemas.services import TariffOut
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository

router = APIRouter(prefix="/partners", route_class=DishkaRoute, tags=["Partners"])


def _tariffs_out(item) -> list[TariffOut]:
    return [TariffOut(tariff_type=t.tariff_type.value, amount=float(t.amount), currency=t.currency.value) for t in item.tariffs]


@router.get("", response_model=PartnerListOut)
@handle_service_errors
async def list_partners(
    partner_repo: FromDishka[PartnerRepository],
    city: Optional[str] = Query(default=None),
    is_active: Optional[bool] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    """List partner clinics, optionally filtered by city or active status."""
    partners = await partner_repo.list_all(city=city, is_active=is_active)
    partners = partners[:limit]
    items = [
        PartnerOut(
            id=p.id, name=p.name, city=p.city, is_active=p.is_active,
            bin=p.bin, contact_email=p.contact_email, contact_phone=p.contact_phone,
        )
        for p in partners
    ]
    return PartnerListOut(items=items, total=len(items))


@router.get("/{partner_id}", response_model=PartnerOut)
@handle_service_errors
async def get_partner(partner_id: str, partner_repo: FromDishka[PartnerRepository]):
    """Get a single partner clinic by id."""
    partner = await partner_repo.get_by_id(partner_id)
    if partner is None:
        raise ValueError(f"partner {partner_id} not found")
    return PartnerOut(
        id=partner.id, name=partner.name, city=partner.city, is_active=partner.is_active,
        bin=partner.bin, contact_email=partner.contact_email, contact_phone=partner.contact_phone,
    )


@router.get("/{partner_id}/services", response_model=PartnerServicesOut)
@handle_service_errors
async def partner_services(
    partner_id: str,
    price_repo: FromDishka[PriceRepository],
):
    """List all active services and prices for a partner."""
    items = await price_repo.list_active_items_for_partner(partner_id)
    service_items = [
        PartnerServiceItemOut(
            item_id=item.id,
            service_id=item.service_id,
            service_name_raw=item.service_name_raw,
            effective_date=item.effective_date,
            tariffs=_tariffs_out(item),
            is_anomaly=item.is_anomaly,
            match_method=item.match_method.value,
            match_confidence=item.match_confidence,
        )
        for item in items
    ]
    return PartnerServicesOut(partner_id=partner_id, items=service_items)
