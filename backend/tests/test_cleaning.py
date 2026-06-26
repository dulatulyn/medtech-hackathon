"""Price/OCR cleanup unit tests."""
from decimal import Decimal

import pytest

from src.parsers.cleaning import accept_xml, clean_price


@pytest.mark.parametrize("raw,expected", [
    ("16 600", Decimal("16600")),
    ("10 80С", Decimal("10800")),      # OCR: С -> 0
    ("12 ООС", Decimal("12000")),      # OCR: О,О,С -> 0
    ("2 099,50", Decimal("2099.50")),  # decimal comma
    ("9000 тг", Decimal("9000")),      # currency word
    (2099.5, Decimal("2099.5")),       # numeric passthrough
    ("1 410", Decimal("1410")),
    ("договорная", None),
    ("", None),
    (None, None),
    (0, None),
])
def test_clean_price(raw, expected):
    assert clean_price(raw) == expected


def test_accept_xml_keeps_insertions_drops_deletions():
    W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xml = (
        f'<w:p xmlns:w="{W}">'
        f'<w:ins><w:r><w:t>KEEP</w:t></w:r></w:ins>'
        f'<w:del><w:r><w:delText>DROP</w:delText></w:r></w:del>'
        f'<w:r><w:t>PLAIN</w:t></w:r>'
        f'</w:p>'
    ).encode()
    out = accept_xml(xml).decode()
    assert "KEEP" in out and "PLAIN" in out
    assert "DROP" not in out
