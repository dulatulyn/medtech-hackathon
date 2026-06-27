"""Turn an OCR text layer (from a scanned price list) into price rows.

Scans lose table structure, so we reconstruct service/price pairs line by line:
a line may carry both name and price, or the name and price land on adjacent lines.
"""
from __future__ import annotations

import re
from decimal import Decimal

from src.enums import TariffType
from src.parsers.base import ParseResult, RawRow, RawTariff
from src.parsers.cleaning import clean_price, normalize_ws

# a price like "31 200", "2 400", "8 500 тг", "1200"
_PRICE = re.compile(r"(\d[\d\s.,]{2,})\s*(?:тг|тенге|kzt|₸|руб)?\.?$", re.IGNORECASE)
_HAS_DIGIT = re.compile(r"\d")


def _split_name_price(line: str) -> tuple[str, Decimal] | None:
    """If a line ends with a price, return (name, amount)."""
    m = _PRICE.search(line)
    if not m:
        return None
    amount = clean_price(m.group(1))
    if amount is None:
        return None
    name = normalize_ws(line[: m.start()].rstrip(" .·–—-"))
    if not name or not any(ch.isalpha() for ch in name):
        return None
    return name, amount


def parse_ocr_text(text: str) -> ParseResult:
    """Reconstruct price rows from an OCR text layer."""
    rows: list[RawRow] = []
    lines = [normalize_ws(ln) for ln in text.splitlines() if normalize_ws(ln)]
    pending_name: str | None = None

    for ln in lines:
        same_line = _split_name_price(ln)
        if same_line:
            name, amount = same_line
            rows.append(_row(name, amount))
            pending_name = None
            continue

        # a bare price line — pair it with the previously held name
        price_only = clean_price(ln) if _PRICE.fullmatch(ln) else None
        if price_only is not None and pending_name:
            rows.append(_row(pending_name, price_only))
            pending_name = None
            continue

        # a text-only line: hold as a candidate service name (skip headers without letters)
        if any(ch.isalpha() for ch in ln):
            pending_name = ln

    warnings = ["ocr_text_parsed"] if rows else ["ocr_no_rows"]
    return ParseResult(rows=rows, warnings=warnings)


def _row(name: str, amount: Decimal) -> RawRow:
    return RawRow(
        service_name_raw=name[:1000],
        tariffs=[RawTariff(TariffType.default, amount)],
        provenance={"source": "ocr", "raw_text": f"{name} {amount}"[:500]},
    )
