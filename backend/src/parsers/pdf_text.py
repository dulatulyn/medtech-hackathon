"""Text-PDF parser (pdfplumber tables, with a line-based fallback)."""
from __future__ import annotations

import io
import re

import pdfplumber

from src.enums import TariffType
from src.parsers.base import ParseResult, RawRow, RawTariff, row_to_rawrow
from src.parsers.cleaning import clean_price, normalize_ws
from src.parsers.columns import find_header_row, map_columns

_LINE = re.compile(r"^(?P<code>[A-ZА-Я0-9][A-ZА-Я0-9.\-/]{1,18})?\s*(?P<name>.+?)\s+(?P<price>[\d  .,]{3,})$")


def parse_pdf_text(data: bytes) -> ParseResult:
    """Extract rows from a text-layer PDF; flag likely scans with low text."""
    rows: list[RawRow] = []
    warnings: list[str] = []
    text_chars = 0
    header_map = None

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        page_tables = []
        page_texts = []
        for page in pdf.pages:
            page_texts.append(page.extract_text() or "")
            text_chars += len(page_texts[-1])
            for table in page.extract_tables():
                page_tables.append((page.page_number, table))

        for page_no, table in page_tables:
            grid = [[(c or "") for c in r] for r in table]
            if not grid:
                continue
            if header_map is None:
                idx = find_header_row(grid)
                candidate = map_columns(grid[idx])
                if candidate.is_usable():
                    header_map, start = candidate, idx + 1
                else:
                    continue
            else:
                start = 0
            for row_idx in range(start, len(grid)):
                row = row_to_rawrow(grid[row_idx], header_map, {"page": page_no, "row": row_idx + 1})
                if row:
                    rows.append(row)

        if not rows:
            rows.extend(_line_fallback(page_texts))

    if text_chars < 50:
        warnings.append("low_text_layer_possible_scan")
    if not rows:
        warnings.append("no_rows_extracted")
    return ParseResult(rows, warnings)


def _line_fallback(page_texts: list[str]) -> list[RawRow]:
    """Parse 'code name ... price' lines when no tables are detected."""
    rows: list[RawRow] = []
    for page_no, text in enumerate(page_texts, start=1):
        for line in text.splitlines():
            match = _LINE.match(line.strip())
            if not match:
                continue
            amount = clean_price(match.group("price"))
            name = normalize_ws(match.group("name"))
            if amount is None or len(name) < 3:
                continue
            rows.append(RawRow(
                service_name_raw=name[:1000],
                tariffs=[RawTariff(TariffType.default, amount)],
                service_code_source=(normalize_ws(match.group("code")) or None),
                provenance={"page": page_no, "raw_text": normalize_ws(line)[:500]},
            ))
    return rows
