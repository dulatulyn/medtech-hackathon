"""Tests for the ValidationService — no database needed."""
from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.dtos.validation_dto import ValidationResultDTO
from src.enums import Currency, TariffType
from src.services.validation_service import ValidationService


def _make_tariff(tariff_type=TariffType.default, amount=Decimal("1000")):
    t = MagicMock()
    t.tariff_type = tariff_type
    t.amount = amount
    t.currency = Currency.KZT
    return t


def _make_item(item_id="i1", partner_id="p1", service_id="s1", tariffs=None, effective_date=None):
    item = MagicMock()
    item.id = item_id
    item.partner_id = partner_id
    item.service_id = service_id
    item.tariffs = tariffs or [_make_tariff()]
    item.effective_date = effective_date
    return item


@pytest.mark.asyncio
async def test_validate_skips_unmatched():
    """Items with no service_id are skipped."""
    item = _make_item(service_id=None)
    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [item]
    price_repo.list_active_items_for_partner_service.return_value = []

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert isinstance(result, ValidationResultDTO)
    assert result.checked == 0


@pytest.mark.asyncio
async def test_validate_archives_previous_item():
    """When a new item supersedes an old one, the old is deactivated."""
    old = _make_item(item_id="old", partner_id="p1", service_id="s1", tariffs=[_make_tariff(amount=Decimal("500"))])
    new = _make_item(item_id="new", partner_id="p1", service_id="s1", tariffs=[_make_tariff(amount=Decimal("600"))])

    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [new]
    price_repo.list_active_items_for_partner_service.return_value = [old, new]
    price_repo.deactivate_item.return_value = None
    price_repo.set_anomaly.return_value = None

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert result.archived == 1
    price_repo.deactivate_item.assert_awaited_once_with("old", "new")


@pytest.mark.asyncio
async def test_validate_flags_anomaly_over_50pct():
    """Price increase >50% triggers anomaly flag."""
    old = _make_item(item_id="old", partner_id="p1", service_id="s1", tariffs=[_make_tariff(amount=Decimal("1000"))])
    new = _make_item(item_id="new", partner_id="p1", service_id="s1", tariffs=[_make_tariff(amount=Decimal("2000"))])

    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [new]
    price_repo.list_active_items_for_partner_service.return_value = [old, new]
    price_repo.deactivate_item.return_value = None
    price_repo.set_anomaly.return_value = None

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert result.anomalies >= 1
    price_repo.set_anomaly.assert_awaited()


@pytest.mark.asyncio
async def test_validate_no_anomaly_small_change():
    """Price change ≤50% does not trigger anomaly."""
    old = _make_item(item_id="old", partner_id="p1", service_id="s1", tariffs=[_make_tariff(amount=Decimal("1000"))])
    new = _make_item(item_id="new", partner_id="p1", service_id="s1", tariffs=[_make_tariff(amount=Decimal("1300"))])

    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [new]
    price_repo.list_active_items_for_partner_service.return_value = [old, new]
    price_repo.deactivate_item.return_value = None
    price_repo.set_anomaly.return_value = None

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert result.anomalies == 0
    price_repo.set_anomaly.assert_not_awaited()


@pytest.mark.asyncio
async def test_validate_warns_nonresident_below_resident():
    """ТЗ 4.4: non-resident tariff below resident tariff is flagged."""
    item = _make_item(tariffs=[
        _make_tariff(TariffType.resident, Decimal("5000")),
        _make_tariff(TariffType.far_abroad, Decimal("4000")),
    ])
    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [item]
    price_repo.list_active_items_for_partner_service.return_value = [item]

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert any("far_abroad" in w and "resident" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_validate_warns_future_effective_date():
    """ТЗ 4.4: a future effective_date is flagged."""
    from datetime import date, timedelta

    item = _make_item(effective_date=date.today() + timedelta(days=365))
    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [item]
    price_repo.list_active_items_for_partner_service.return_value = [item]

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert any("future effective_date" in w for w in result.warnings)


@pytest.mark.asyncio
async def test_validate_flags_zero_price():
    """Zero tariff amount is recorded as an error."""
    item = _make_item(tariffs=[_make_tariff(amount=Decimal("0"))])

    price_repo = AsyncMock()
    price_repo.list_items_for_doc.return_value = [item]
    price_repo.list_active_items_for_partner_service.return_value = [item]
    price_repo.deactivate_item.return_value = None

    svc = ValidationService(price_repo)
    result = await svc.validate_document("doc1")

    assert result.errors >= 1
    assert any("≤ 0" in w for w in result.warnings)
