"""Geometry-based table reconstruction for borderless text PDFs.

pdfplumber's table detection needs ruling lines; many clinic price lists have
none. Here we cluster words into visual lines by their y-position, infer column
boundaries from vertical whitespace gaps over *data* rows, classify each column
(name / code / unit / price-tier), and merge wrapped multi-line names.
"""
from __future__ import annotations

import io
import re
import statistics

import pdfplumber

from src.enums import TariffType
from src.parsers.base import ParseResult, RawRow, RawTariff
from src.parsers.cleaning import clean_price, normalize_ws
from src.parsers.columns import classify_tariff

_CODE_RE = re.compile(r"[A-ZА-ЯЁ]\d{2}[.\d]{2,}")  # tarifikator/MKB e.g. В02.110.002
_PURE_INT = re.compile(r"\d{1,4}")
_NAME_HINTS = ("наимен", "услуг", "перечень", "вид ")  # header words for the name column
_UNIT_HEADER = ("ед.", "ед ", "измер", "единиц", "кол-во")  # header words for the unit column
_UNIT_CONTENT = ("посещен", "койко", "сутки", "процедур")  # content tokens specific to units
_SECTION_RE = re.compile(r"^(блок|раздел|отделение|глава)\b", re.IGNORECASE)
_MIN_PRICE = 50  # values below this are counts/№, not prices


def _cluster_lines(words: list[dict], y_tol: float = 3.0) -> list[list[dict]]:
    """Group words into visual lines by vertical midpoint, left-to-right."""
    lines: list[list] = []
    for word in sorted(words, key=lambda w: (round(w["top"]), w["x0"])):
        mid = (word["top"] + word["bottom"]) / 2
        if lines and abs(mid - lines[-1][0]) <= y_tol:
            lines[-1][1].append(word)
        else:
            lines.append([mid, [word]])
    return [sorted(ws, key=lambda w: w["x0"]) for _, ws in lines]


def _is_data_line(words: list[dict], page_width: float) -> bool:
    """True if a line carries a price-like number in its right ~55%."""
    right = page_width * 0.45
    for word in words:
        if (word["x0"] + word["x1"]) / 2 >= right and len(re.findall(r"\d", word["text"])) >= 2:
            return True
    return False


def _detect_columns(data_lines: list[list[dict]], page_width: float,
                    bin_w: float = 2.0, gap_min: float = 6.0, occ_frac: float = 0.18) -> list[float]:
    """Return column separator x-positions from whitespace gaps over data rows."""
    nbins = int(page_width / bin_w) + 1
    coverage = [0] * nbins
    for words in data_lines:
        for word in words:
            for b in range(int(word["x0"] / bin_w), int(word["x1"] / bin_w) + 1):
                if 0 <= b < nbins:
                    coverage[b] += 1
    thresh = max(2, int(occ_frac * len(data_lines)))
    seps: list[float] = []
    run_start: int | None = None
    for b in range(nbins + 1):
        low = b == nbins or coverage[b] < thresh
        if low and run_start is None:
            run_start = b
        elif not low and run_start is not None:
            if (b - run_start) * bin_w >= gap_min:
                seps.append(((run_start + b) / 2) * bin_w)
            run_start = None
    return seps


def _assign(words: list[dict], seps: list[float]) -> list[str]:
    """Bucket a line's words into columns delimited by separator x-positions."""
    cells = [""] * (len(seps) + 1)
    for word in words:
        mid = (word["x0"] + word["x1"]) / 2
        col = 0
        while col < len(seps) and mid > seps[col]:
            col += 1
        cells[col] = (cells[col] + " " + word["text"]).strip()
    return cells


def _header_cells(page_lines: list[list[dict]], seps: list[float], page_width: float) -> list[str]:
    """Concatenate header text per column from lines above the first data row."""
    ncols = len(seps) + 1
    cells = [""] * ncols
    for words in page_lines:
        if _is_data_line(words, page_width):
            break
        for col, text in enumerate(_assign(words, seps)):
            if text:
                cells[col] = (cells[col] + " " + text).strip()
    return cells


def _col_center(col: int, seps: list[float], page_width: float) -> float:
    """Horizontal midpoint of a column band."""
    left = seps[col - 1] if col > 0 else 0.0
    right = seps[col] if col < len(seps) else page_width
    return (left + right) / 2


def _classify(grid: list[list[str]], header: list[str], seps: list[float],
              page_width: float) -> list[tuple[str, TariffType | None]]:
    """Assign a role to each column: price / num / code / unit / name."""
    ncols = len(header)
    roles: list[tuple[str, TariffType | None]] = []
    for col in range(ncols):
        column = [row[col] for row in grid if col < len(row)]
        nonempty = [c for c in column if c]
        values = [clean_price(c) for c in nonempty]
        priced = [v for v in values if v is not None]
        head = (header[col] if col < len(header) else "").lower()

        if any(h in head for h in _NAME_HINTS):  # explicit name header wins outright
            roles.append(("name", None))
            continue

        # A price column is numeric, large-valued, AND in the right part of the page
        # (the leftmost numeric column is the № row index, never a price).
        price_rate = len(priced) / len(nonempty) if nonempty else 0
        in_price_zone = _col_center(col, seps, page_width) > page_width * 0.30
        if priced and price_rate >= 0.4 and statistics.median(priced) >= _MIN_PRICE and in_price_zone:
            roles.append(("price", classify_tariff(head)))
            continue

        pure_int = sum(1 for c in nonempty if _PURE_INT.fullmatch(c.replace(" ", "")))
        if nonempty and pure_int / len(nonempty) >= 0.6:
            roles.append(("num", None))
            continue

        code_rate = sum(1 for c in nonempty if _CODE_RE.search(c)) / len(nonempty) if nonempty else 0
        if "код" in head or code_rate >= 0.3:
            roles.append(("code", None))
            continue

        unit_content = sum(1 for c in nonempty if any(h in c.lower() for h in _UNIT_CONTENT)) / len(nonempty) if nonempty else 0
        if any(h in head for h in _UNIT_HEADER) or unit_content >= 0.5:
            roles.append(("unit", None))
            continue

        roles.append(("name", None))
    return roles


def _emit(page_lines: list[list[dict]], seps: list[float], roles: list[tuple[str, TariffType | None]],
          page_width: float, page_no: int) -> list[RawRow]:
    """Build logical rows, merging wrapped name fragments into the priced line."""
    name_cols = [i for i, (r, _) in enumerate(roles) if r == "name"]
    code_cols = [i for i, (r, _) in enumerate(roles) if r == "code"]
    unit_cols = [i for i, (r, _) in enumerate(roles) if r == "unit"]
    price_cols = [(i, t) for i, (r, t) in enumerate(roles) if r == "price"]

    rows: list[RawRow] = []
    name_buffer: list[str] = []
    for words in page_lines:
        cells = _assign(words, seps)
        line_text = " ".join(c for c in cells if c).strip()

        def pick(cols):
            return " ".join(cells[i] for i in cols if i < len(cells) and cells[i]).strip()

        if not _is_data_line(words, page_width):
            frag = pick(name_cols)
            if frag and not _SECTION_RE.match(line_text) and not _is_section(line_text):
                name_buffer.append(frag)
            continue

        own_name = pick(name_cols)
        full_name = normalize_ws(" ".join([*name_buffer, own_name]))
        name_buffer = []

        tariffs = []
        for col, tariff in price_cols:
            amount = clean_price(cells[col]) if col < len(cells) else None
            if amount is not None:
                tariffs.append(RawTariff(tariff or TariffType.default, amount))
        if not tariffs or not full_name or not any(ch.isalpha() for ch in full_name):
            continue

        code = pick(code_cols) or _extract_code(full_name)
        unit = pick(unit_cols) or None
        prov = {"page": page_no, "raw_text": line_text[:500]}
        if unit:
            prov["unit"] = unit
        rows.append(RawRow(
            service_name_raw=_strip_code(full_name)[:1000],
            tariffs=tariffs,
            service_code_source=(normalize_ws(code)[:100] if code else None),
            provenance=prov,
        ))
    return rows


def _is_section(text: str) -> bool:
    """A short all-caps line is a section header, not a service."""
    letters = [c for c in text if c.isalpha()]
    return bool(letters) and sum(1 for c in letters if c.isupper()) / len(letters) > 0.8 and len(text) < 60


def _extract_code(name: str) -> str | None:
    """Pull an embedded tarifikator code out of a name string."""
    match = _CODE_RE.search(name)
    return match.group(0) if match else None


def _strip_code(name: str) -> str:
    """Remove an embedded code token from the visible name."""
    return normalize_ws(_CODE_RE.sub(" ", name))


def parse_pdf_geometry(data: bytes) -> ParseResult:
    """Reconstruct a borderless PDF table from word geometry."""
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        if not pdf.pages:
            return ParseResult([], ["empty_pdf"])
        page_width = pdf.pages[0].width
        page_lines = [_cluster_lines(page.extract_words()) for page in pdf.pages]

    data_lines = [ws for lines in page_lines for ws in lines if _is_data_line(ws, page_width)]
    if not data_lines:
        return ParseResult([], ["no_data_lines"])

    seps = _detect_columns(data_lines, page_width)
    if not seps:
        return ParseResult([], ["no_columns_detected"])

    grid = [_assign(ws, seps) for ws in data_lines]
    header = _header_cells(page_lines[0], seps, page_width)
    roles = _classify(grid, header, seps, page_width)
    if not any(r == "price" for r, _ in roles):
        return ParseResult([], ["no_price_column"])

    rows: list[RawRow] = []
    for page_no, lines in enumerate(page_lines, start=1):
        rows.extend(_emit(lines, seps, roles, page_width, page_no))
    return ParseResult(rows, [])
