"""Parser interface and shared row-extraction helpers."""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Protocol

from src.enums import Currency, TariffType
from src.parsers.cleaning import clean_price, detect_currency, normalize_ws
from src.parsers.columns import ColumnMap


@dataclass
class RawTariff:
    """One extracted price under a tariff tier, with its source currency."""

    tariff_type: TariffType
    amount: Decimal
    currency: Currency = Currency.KZT


@dataclass
class RawRow:
    """One extracted service line with its prices and provenance."""

    service_name_raw: str
    tariffs: list[RawTariff]
    service_code_source: str | None = None
    provenance: dict = field(default_factory=dict)


@dataclass
class ParseResult:
    """Output of a parser: extracted rows plus any warnings."""

    rows: list[RawRow]
    warnings: list[str] = field(default_factory=list)


class Parser(Protocol):
    """Extracts raw price rows from a document's bytes."""

    def parse(self, data: bytes) -> ParseResult: ...


def row_to_rawrow(cells: list, cmap: ColumnMap, provenance: dict) -> RawRow | None:
    """Build a RawRow from a data row using the column map; None if not a service row."""
    def cell(index: int | None):
        if index is None or index >= len(cells):
            return None
        return cells[index]

    name = normalize_ws(cell(cmap.name))
    if not name or not any(ch.isalpha() for ch in name):
        return None  # empty or numeric-only (e.g. a column-number row)

    tariffs: list[RawTariff] = []
    for col, tariff_type in cmap.prices:
        raw_cell = cell(col)
        amount = clean_price(raw_cell)
        if amount is not None:
            currency = Currency[detect_currency(raw_cell)]
            tariffs.append(RawTariff(tariff_type, amount, currency))
    if not tariffs:
        return None  # section/title row with no price

    code = normalize_ws(cell(cmap.code)) or None
    unit = normalize_ws(cell(cmap.unit)) or None
    prov = dict(provenance)
    if unit:
        prov["unit"] = unit
    prov["raw_text"] = " | ".join(normalize_ws(c) for c in cells if c is not None)[:500]
    return RawRow(
        service_name_raw=name[:1000],
        tariffs=tariffs,
        service_code_source=(code[:100] if code else None),
        provenance=prov,
    )
