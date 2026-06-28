"""Currency conversion to KZT (ТЗ 4.4: «Валюта не KZT → конвертировать по курсу»).

Infra-light: a static rate table keyed by currency, good enough for the archive
(prices are overwhelmingly KZT). The `on_date` argument and the Protocol seam make
this a drop-in point for a live National Bank of Kazakhstan rate feed per price date.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Protocol, runtime_checkable

from src.enums import Currency

# KZT per 1 unit of foreign currency. Approximate mid-2026 reference rates; the
# pluggable seam (FxConverter Protocol) lets a date-aware NB RK client replace this.
_DEFAULT_RATES: dict[Currency, Decimal] = {
    Currency.KZT: Decimal("1"),
    Currency.USD: Decimal("525"),
    Currency.RUB: Decimal("5.5"),
}


@runtime_checkable
class FxConverter(Protocol):
    """Converts a foreign-currency amount to KZT for a given price date."""

    def to_kzt(self, amount: Decimal, currency: Currency, on_date: date | None = None) -> Decimal: ...


class StaticFxConverter:
    """Converts using a fixed rate table. Date is accepted but not yet used."""

    name = "static"

    def __init__(self, rates: dict[Currency, Decimal] | None = None):
        self.rates = rates or dict(_DEFAULT_RATES)

    def to_kzt(self, amount: Decimal, currency: Currency, on_date: date | None = None) -> Decimal:
        """Return the amount in KZT, rounded to 2 decimals. KZT passes through unchanged."""
        if currency == Currency.KZT:
            return amount
        rate = self.rates.get(currency)
        if rate is None:
            return amount  # unknown currency: leave as-is rather than corrupt the value
        return (amount * rate).quantize(Decimal("0.01"))
