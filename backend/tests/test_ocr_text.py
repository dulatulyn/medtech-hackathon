"""Tests for OCR text -> price row reconstruction (no DB, no network)."""
from __future__ import annotations

from decimal import Decimal

from src.parsers.ocr_text import parse_ocr_text

# The exact text Azure Document Intelligence returned for a synthetic scan.
_AZURE_OUTPUT = """Прайс-лист клиники «Сеним»
МРТ головного мозга
31 200 тг
Общий анализ крови
2 400 тг
Консультация терапевта 8 500 тг"""


def test_parse_ocr_reconstructs_rows():
    result = parse_ocr_text(_AZURE_OUTPUT)
    by_name = {r.service_name_raw: r.tariffs[0].amount for r in result.rows}
    assert by_name["МРТ головного мозга"] == Decimal("31200")
    assert by_name["Общий анализ крови"] == Decimal("2400")
    assert by_name["Консультация терапевта"] == Decimal("8500")


def test_parse_ocr_same_line_name_and_price():
    result = parse_ocr_text("УЗИ брюшной полости .......... 9 600 тг")
    assert len(result.rows) == 1
    assert result.rows[0].service_name_raw == "УЗИ брюшной полости"
    assert result.rows[0].tariffs[0].amount == Decimal("9600")


def test_parse_ocr_ignores_priceless_header():
    result = parse_ocr_text("ПРАЙС-ЛИСТ 2026 ГОД\nЭлектрокардиография 3 900")
    assert len(result.rows) == 1
    assert result.rows[0].service_name_raw == "Электрокардиография"


def test_parse_ocr_empty():
    assert parse_ocr_text("   \n  \n").rows == []
