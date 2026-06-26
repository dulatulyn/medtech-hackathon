"""Excel parser test on a synthetic workbook (title block + section + multi-price)."""
import io

import openpyxl

from src.enums import FileFormat, TariffType
from src.parsers.excel import parse_excel


def _xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["ПРЕЙСКУРАНТ", None, None, None, None])
    ws.append([None, None, None, None, None])
    ws.append(["№", "Наименование услуги", "Код",
               "Цена для граждан Республики Казахстан",
               "Цена для граждан стран дальнего зарубежья"])
    ws.append(["", "Раздел 1. Консультации", "", "", ""])  # section row, no prices
    ws.append([1, "Прием врача", "U1.1", "16 600", "30 000"])
    ws.append([2, "Общий анализ крови", "В02.110.002", 880, 1410])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_parse_excel_multi_price_skips_sections():
    result = parse_excel(_xlsx_bytes(), FileFormat.xlsx)
    assert len(result.rows) == 2  # section row skipped
    first = result.rows[0]
    assert first.service_name_raw == "Прием врача"
    assert first.service_code_source == "U1.1"
    assert {t.tariff_type for t in first.tariffs} == {TariffType.resident, TariffType.far_abroad}
    assert any(str(t.amount) == "16600" for t in first.tariffs)
    second = result.rows[1]
    assert second.service_code_source == "В02.110.002"
    assert any(str(t.amount) == "880" for t in second.tariffs)
