"""Services endpoints: catalog lookups, price history, cross-partner comparison."""
from __future__ import annotations

from typing import Optional

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Query

from src.api.exceptions.exception_handlers import handle_service_errors
from src.api.v1.schemas.services import (
    PriceComparePartnerOut,
    PriceHistoryItemOut,
    ServiceListOut,
    ServiceOut,
    ServicePartnersItemOut,
    ServicePartnersOut,
    TariffOut,
)
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository

router = APIRouter(prefix="/services", route_class=DishkaRoute, tags=["Services"])


def _tariffs_out(item) -> list[TariffOut]:
    return [TariffOut(tariff_type=t.tariff_type.value, amount=float(t.amount), currency=t.currency.value) for t in item.tariffs]


@router.get("", response_model=ServiceListOut)
@handle_service_errors
async def list_services(
    catalog_repo: FromDishka[CatalogRepository],
    q: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """List catalog services, optionally filtered by name query or category."""
    services = await catalog_repo.list_services(category=category, q=q, limit=limit, offset=offset)
    total = await catalog_repo.count_services(category=category)
    return ServiceListOut(
        items=[ServiceOut(id=s.id, name=s.name, category=s.category, icd_code=s.icd_code, is_active=s.is_active) for s in services],
        total=total,
    )


@router.get("/{service_id}", response_model=ServiceOut)
@handle_service_errors
async def get_service(service_id: str, catalog_repo: FromDishka[CatalogRepository]):
    """Get a single catalog service by id."""
    service = await catalog_repo.get_by_id(service_id)
    if service is None:
        raise ValueError(f"service {service_id} not found")
    return ServiceOut(id=service.id, name=service.name, category=service.category, icd_code=service.icd_code, is_active=service.is_active)


@router.get("/{service_id}/partners", response_model=ServicePartnersOut)
@handle_service_errors
async def service_partners(
    service_id: str,
    price_repo: FromDishka[PriceRepository],
):
    """List all partners offering this service with their current prices."""
    items = await price_repo.list_active_items_for_service(service_id)
    partner_items = [
        ServicePartnersItemOut(
            partner_id=item.partner_id,
            effective_date=item.effective_date,
            tariffs=_tariffs_out(item),
            is_anomaly=item.is_anomaly,
            provenance=item.provenance,
        )
        for item in items
    ]
    return ServicePartnersOut(service_id=service_id, partners=partner_items)


@router.get("/{service_id}/price-history", response_model=list[PriceHistoryItemOut])
@handle_service_errors
async def price_history(
    service_id: str,
    price_repo: FromDishka[PriceRepository],
    partner_id: Optional[str] = Query(default=None),
):
    """Return full price history for a service across all or one partner."""
    items = await price_repo.get_price_history(service_id, partner_id)
    return [
        PriceHistoryItemOut(
            item_id=item.id,
            partner_id=item.partner_id,
            effective_date=item.effective_date,
            tariffs=_tariffs_out(item),
            is_active=item.is_active,
            is_anomaly=item.is_anomaly,
            anomaly_reason=item.anomaly_reason,
            created_at=str(item.created_at),
        )
        for item in items
    ]


@router.get("/{service_id}/price-compare", response_model=list[PriceComparePartnerOut])
@handle_service_errors
async def price_compare(
    service_id: str,
    price_repo: FromDishka[PriceRepository],
):
    """Compare current prices across all partners for a service."""
    items = await price_repo.list_active_items_for_service(service_id)
    result = []
    for item in items:
        tariff_map = {t.tariff_type.value: float(t.amount) for t in item.tariffs}
        result.append(PriceComparePartnerOut(
            partner_id=item.partner_id,
            tariffs=tariff_map,
            effective_date=item.effective_date,
            is_anomaly=item.is_anomaly,
        ))
    return result
