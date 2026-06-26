"""Text-PDF parser: ruling-line tables, word-geometry, or line-regex fallback."""
from __future__ import annotations

import io
import re

import pdfplumber

from src.enums import TariffType
from src.parsers.base import ParseResult, RawRow, RawTariff, row_to_rawrow
from src.parsers.cleaning import clean_price, normalize_ws
from src.parsers.columns import find_header_row, map_columns
from src.parsers.pdf_geometry import parse_pdf_geometry

# "code? name ... price" — price may end in OCR-confused letters (о с з б і l).
_LINE = re.compile(
    r"^(?P<code>[A-ZА-Я0-9][A-ZА-Я0-9.\-/]{1,18})?\s*(?P<name>.+?)\s+(?P<price>[\d .,оОсСзЗбБіІlI|]{3,})$"
)


def parse_pdf_text(data: bytes) -> ParseResult:
    """Extract rows from a text-layer PDF; flag likely scans with low text."""
    warnings: list[str] = []
    text_chars = 0
    page_texts: list[str] = []
    header_map = None
    rows: list[RawRow] = []

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        page_tables = []
        for page in pdf.pages:
            text = page.extract_text() or ""
            page_texts.append(text)
            text_chars += len(text)
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
        rows = _best_borderless(data, page_texts)

    if text_chars < 50:
        warnings.append("low_text_layer_possible_scan")
    if not rows:
        warnings.append("no_rows_extracted")
    return ParseResult(rows, warnings)


def _best_borderless(data: bytes, page_texts: list[str]) -> list[RawRow]:
    """Pick geometry for multi-tariff tables, else the line-regex fallback."""
    geometry = parse_pdf_geometry(data).rows
    if any(len(row.tariffs) > 1 for row in geometry):
        return geometry
    line_rows = _line_fallback(page_texts)
    return geometry if len(geometry) > len(line_rows) else line_rows


def _line_fallback(page_texts: list[str]) -> list[RawRow]:
    """Parse 'code name ... price' lines when no table structure is detected."""
    rows: list[RawRow] = []
    for page_no, text in enumerate(page_texts, start=1):
        for line in text.splitlines():
            match = _LINE.match(line.strip())
            if not match:
                continue
            amount = clean_price(match.group("price"))
            name = normalize_ws(match.group("name"))
            if amount is None or len(name) < 3 or not any(ch.isalpha() for ch in name):
                continue
            rows.append(RawRow(
                service_name_raw=name[:1000],
                tariffs=[RawTariff(TariffType.default, amount)],
                service_code_source=(normalize_ws(match.group("code")) or None),
                provenance={"page": page_no, "raw_text": normalize_ws(line)[:500]},
            ))
    return rows
