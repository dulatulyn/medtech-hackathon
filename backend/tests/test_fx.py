"""Currency detection + FX conversion to KZT (ТЗ 4.4). Pure unit, no DB."""
from __future__ import annotations

from decimal import Decimal

from src.enums import Currency
from src.integrations.fx import StaticFxConverter
from src.parsers.cleaning import detect_currency


def test_detect_currency_defaults_to_kzt():
    assert detect_currency("12 500 тг") == "KZT"
    assert detect_currency("8500") == "KZT"
    assert detect_currency(9600) == "KZT"
    assert detect_currency(None) == "KZT"


def test_detect_currency_usd_and_rub():
    assert detect_currency("120 USD") == "USD"
    assert detect_currency("$45") == "USD"
    assert detect_currency("3 500 руб") == "RUB"
    assert detect_currency("3500 RUB") == "RUB"


def test_kzt_passes_through_unchanged():
    fx = StaticFxConverter()
    assert fx.to_kzt(Decimal("10000"), Currency.KZT) == Decimal("10000")


def test_usd_converts_to_kzt():
    fx = StaticFxConverter(rates={Currency.USD: Decimal("525"), Currency.KZT: Decimal("1")})
    assert fx.to_kzt(Decimal("100"), Currency.USD) == Decimal("52500.00")


def test_rub_converts_and_rounds():
    fx = StaticFxConverter(rates={Currency.RUB: Decimal("5.5"), Currency.KZT: Decimal("1")})
    assert fx.to_kzt(Decimal("3500"), Currency.RUB) == Decimal("19250.00")


def test_unknown_currency_left_untouched():
    fx = StaticFxConverter(rates={Currency.KZT: Decimal("1")})
    # No rate for USD in this table → return the amount rather than corrupt it.
    assert fx.to_kzt(Decimal("100"), Currency.USD) == Decimal("100")
