"""DOCX parser test on a synthetic table."""
import io

import docx

from src.parsers.docx import parse_docx


def _docx_bytes() -> bytes:
    document = docx.Document()
    table = document.add_table(rows=0, cols=3)
    for cells in [
        ("Код", "Наименование услуги", "Стоимость, тенге"),
        ("", "Раздел 1. Консультации", ""),       # section row, no price
        ("U1.1", "Консультативный прием врача д.м.н.", "16 600"),
        ("DR3.1", "Прием врача дерматовенеролога", "11 600"),
    ]:
        row = table.add_row().cells
        for i, value in enumerate(cells):
            row[i].text = value
    buf = io.BytesIO()
    document.save(buf)
    return buf.getvalue()


def test_parse_docx_table():
    result = parse_docx(_docx_bytes())
    assert len(result.rows) == 2  # section skipped
    assert result.rows[0].service_code_source == "U1.1"
    assert str(result.rows[0].tariffs[0].amount) == "16600"
