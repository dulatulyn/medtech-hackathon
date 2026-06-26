"""DOCX parser (accepts tracked changes, reads tables)."""
from __future__ import annotations

import io

import docx

from src.parsers.base import ParseResult, RawRow, row_to_rawrow
from src.parsers.cleaning import accept_tracked_changes
from src.parsers.columns import find_header_row, map_columns


def parse_docx(data: bytes) -> ParseResult:
    """Extract rows from every table in a DOCX, after accepting tracked changes."""
    data = accept_tracked_changes(data)
    document = docx.Document(io.BytesIO(data))
    rows: list[RawRow] = []
    warnings: list[str] = []
    for table_idx, table in enumerate(document.tables):
        grid = [[cell.text for cell in row.cells] for row in table.rows]
        if not grid:
            continue
        header_idx = find_header_row(grid)
        cmap = map_columns(grid[header_idx])
        if not cmap.is_usable():
            warnings.append(f"table {table_idx}: no usable header")
            continue
        for row_idx in range(header_idx + 1, len(grid)):
            row = row_to_rawrow(grid[row_idx], cmap, {"table": table_idx, "row": row_idx + 1})
            if row:
                rows.append(row)
    return ParseResult(rows, warnings)
