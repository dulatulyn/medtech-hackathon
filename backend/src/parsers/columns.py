"""Header detection and column mapping for tabular price lists."""
from __future__ import annotations

from dataclasses import dataclass, field

from src.enums import TariffType

_HEADER_HINTS = (
    "наимен", "услуг", "цена", "стоим", "тариф", "код", "ед.", "ед ",
    "измер", "единиц", "тенге", "прайс",
)


def _norm(value) -> str:
    """Lowercased, trimmed string of a cell."""
    return str(value).strip().lower() if value is not None else ""


def classify_tariff(header: str) -> TariffType:
    """Map a price-column header to a tariff tier."""
    text = _norm(header)
    if "страхов" in text:
        return TariffType.insurance
    if "дальн" in text:
        return TariffType.far_abroad
    if "снг" in text or "ближн" in text:
        return TariffType.cis
    if "нерезидент" in text:
        return TariffType.far_abroad
    if "резидент" in text:
        return TariffType.resident
    if "граждан" in text and "казахстан" in text:
        return TariffType.resident
    if "партн" in text:
        return TariffType.partner
    if "без" in text and "ндс" in text:
        return TariffType.no_vat
    if "ндс" in text:
        return TariffType.with_vat
    return TariffType.default


@dataclass
class ColumnMap:
    """Resolved column indices for a price table."""

    name: int | None = None
    code: int | None = None
    unit: int | None = None
    prices: list[tuple[int, TariffType]] = field(default_factory=list)

    def is_usable(self) -> bool:
        """True if we can extract a name and at least one price."""
        return self.name is not None and bool(self.prices)


def map_columns(header: list) -> ColumnMap:
    """Build a ColumnMap from a header row's cells."""
    cmap = ColumnMap()
    for index, cell in enumerate(header):
        text = _norm(cell)
        if not text:
            continue
        if cmap.name is None and ("наимен" in text or ("услуг" in text and "цена" not in text and "код" not in text)):
            cmap.name = index
            continue
        if cmap.code is None and "код" in text:
            cmap.code = index
            continue
        if cmap.unit is None and ("ед." in text or "ед " in text or "измер" in text or "единиц" in text):
            cmap.unit = index
            continue
        if any(k in text for k in ("цена", "стоим", "тариф", "тенге", "price")):
            cmap.prices.append((index, classify_tariff(text)))
    return cmap


def find_header_row(rows: list[list], max_scan: int = 30) -> int:
    """Return the index of the header row that yields the most mappable columns."""
    best_index, best_score = 0, -1
    for index, row in enumerate(rows[:max_scan]):
        cmap = map_columns(row)
        score = (
            (cmap.name is not None)
            + (cmap.code is not None)
            + (cmap.unit is not None)
            + 2 * len(cmap.prices)
        )
        if score > best_score:
            best_index, best_score = index, score
    return best_index
