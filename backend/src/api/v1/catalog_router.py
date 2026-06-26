"""Catalog endpoints: search, unmatched queue, and manual match (P7 self-learning)."""
from __future__ import annotations

from typing import Optional

from dishka import FromDishka
from dishka.integrations.fastapi import DishkaRoute
from fastapi import APIRouter, Query

from src.api.exceptions.exception_handlers import handle_service_errors
from src.api.v1.schemas.partners import (
    MatchIn,
    MatchOut,
    SearchOut,
    SearchResultItemOut,
    UnmatchedItemOut,
    UnmatchedListOut,
)
from src.api.v1.schemas.services import TariffOut
from src.core.logging import get_logger
from src.enums import MatchMethod, SynonymSource
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.price_repository import PriceRepository
from src.services.catalog_service import CatalogService

logger = get_logger(__name__)

router = APIRouter(route_class=DishkaRoute, tags=["Catalog"])


def _tariffs_out(item) -> list[TariffOut]:
    return [TariffOut(tariff_type=t.tariff_type.value, amount=float(t.amount), currency=t.currency.value) for t in item.tariffs]


@router.get("/search", response_model=SearchOut)
@handle_service_errors
async def search(
    price_repo: FromDishka[PriceRepository],
    q: str = Query(min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    """Search active price items by service name using trigram similarity."""
    items = await price_repo.search_items(query=q, limit=limit)
    result_items = [
        SearchResultItemOut(
            item_id=item.id,
            partner_id=item.partner_id,
            service_name_raw=item.service_name_raw,
            service_id=item.service_id,
            effective_date=item.effective_date,
            tariffs=_tariffs_out(item),
            is_anomaly=item.is_anomaly,
        )
        for item in items
    ]
    return SearchOut(query=q, items=result_items, total=len(result_items))


@router.get("/unmatched", response_model=UnmatchedListOut)
@handle_service_errors
async def list_unmatched(
    price_repo: FromDishka[PriceRepository],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Return price items pending normalization, with candidate context."""
    items = await price_repo.list_unmatched(limit=limit, offset=offset)
    total = await price_repo.count_unmatched()
    result_items = [
        UnmatchedItemOut(
            item_id=item.id,
            partner_id=item.partner_id,
            service_name_raw=item.service_name_raw,
            service_code_source=item.service_code_source,
            provenance=item.provenance,
            tariffs=_tariffs_out(item),
        )
        for item in items
    ]
    return UnmatchedListOut(items=result_items, total=total, limit=limit, offset=offset)


@router.post("/match", response_model=MatchOut)
@handle_service_errors
async def match_item(
    body: MatchIn,
    catalog_repo: FromDishka[CatalogRepository],
    price_repo: FromDishka[PriceRepository],
    catalog_service: FromDishka[CatalogService],
):
    """Manually link a price item to a service. Teaches the system (self-learning)."""
    item = await price_repo.get_item_with_tariffs(body.item_id)
    if item is None:
        raise ValueError(f"item {body.item_id} not found")

    service_id = body.service_id

    # Create a new service if requested
    if service_id is None:
        if not body.new_service_name:
            raise ValueError("provide service_id or new_service_name")
        service = await catalog_repo.create_service(
            body.new_service_name,
            category=body.new_service_category,
        )
        service_id = service.id
        logger.info("service_created_by_operator", service_id=service_id, name=body.new_service_name)

    # Verify service exists
    service = await catalog_repo.get_by_id(service_id)
    if service is None:
        raise ValueError(f"service {service_id} not found")

    # P7 self-learning: add raw name as operator synonym
    existing_syns = await catalog_repo.get_synonym_texts(service_id)
    synonyms_added = 0
    if item.service_name_raw.lower() not in {s.lower() for s in existing_syns}:
        await catalog_repo.add_synonym(service_id, item.service_name_raw, SynonymSource.operator)
        synonyms_added = 1
        logger.info("synonym_added", service_id=service_id, text=item.service_name_raw)

    # Link this item
    await price_repo.update_item_match(item.id, service_id, MatchMethod.manual, confidence=1.0)
    await price_repo.set_verified(item.id, note=body.note)

    # Twin matching: auto-match other unmatched items with the same raw name
    twins = await price_repo.find_unmatched_by_name(item.service_name_raw)
    twins_rematched = 0
    for twin in twins:
        if twin.id == item.id:
            continue
        await price_repo.update_item_match(twin.id, service_id, MatchMethod.synonym, confidence=0.95)
        twins_rematched += 1

    logger.info("manual_match_done", item_id=item.id, service_id=service_id, twins=twins_rematched)
    return MatchOut(
        item_id=item.id,
        service_id=service_id,
        method="manual",
        synonyms_added=synonyms_added,
        twins_rematched=twins_rematched,
    )
