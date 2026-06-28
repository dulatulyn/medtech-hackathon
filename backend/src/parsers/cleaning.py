"""Text and price cleanup utilities, including OCR-artifact repair."""
from __future__ import annotations

import io
import re
import zipfile
from decimal import Decimal, InvalidOperation

# OCR confusions seen in real scans: letters that should be digits (lowercased keys).
_OCR_DIGITS = {
    "о": "0", "o": "0", "с": "0", "c": "0", "з": "3", "б": "6",
    "l": "1", "i": "1", "|": "1", "і": "1",
}
_CURRENCY = re.compile(r"(тенге|тг|₸|kzt|руб\.?|rub|usd|\$|сом)", re.IGNORECASE)
_NBSP = " "


_CURRENCY_TOKENS = (
    (re.compile(r"(usd|\$|долл)", re.IGNORECASE), "USD"),
    (re.compile(r"(руб\.?|rub|₽)", re.IGNORECASE), "RUB"),
)


def detect_currency(raw) -> str:
    """Detect the source currency of a raw price cell; default 'KZT'.

    Returns a Currency enum *name* (str) so parsers stay decoupled from the enum import.
    Numbers carry no symbol, so they default to KZT — matching the archive.
    """
    if raw is None or isinstance(raw, (int, float, Decimal)):
        return "KZT"
    text = str(raw)
    for pattern, code in _CURRENCY_TOKENS:
        if pattern.search(text):
            return code
    return "KZT"


def clean_price(raw) -> Decimal | None:
    """Parse a price from a noisy cell into a positive Decimal, or None."""
    if raw is None:
        return None
    if isinstance(raw, (int, float, Decimal)):
        value = Decimal(str(raw))
        return value if value > 0 else None

    text = _CURRENCY.sub(" ", str(raw).lower()).replace(_NBSP, " ")
    text = "".join(_OCR_DIGITS.get(ch, ch) for ch in text)
    candidates = re.findall(r"[\d .,]+", text)
    if not candidates:
        return None
    token = max(candidates, key=len).strip()
    if not any(ch.isdigit() for ch in token):
        return None
    token = token.replace(" ", "")
    # decimal comma with exactly two trailing digits -> decimal point; else strip separators
    if "," in token and "." not in token:
        head, _, tail = token.rpartition(",")
        token = f"{head}.{tail}" if len(tail) == 2 else token.replace(",", "")
    token = token.replace(",", "")
    try:
        value = Decimal(token)
    except InvalidOperation:
        return None
    return value if value > 0 else None


def normalize_ws(text: str | None) -> str:
    """Collapse whitespace and trim."""
    if text is None:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def accept_tracked_changes(docx_bytes: bytes) -> bytes:
    """Return a .docx with tracked changes accepted (keep insertions, drop deletions)."""
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as zin:
        names = zin.namelist()
        contents = {name: zin.read(name) for name in names}

    document = contents.get("word/document.xml")
    if document is not None:
        contents["word/document.xml"] = accept_xml(document)

    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
        for name in names:
            zout.writestr(name, contents[name])
    return out.getvalue()


def accept_xml(xml_bytes: bytes) -> bytes:
    """Accept tracked changes in a WordprocessingML document part."""
    from lxml import etree

    tree = etree.fromstring(xml_bytes)
    for deleted in list(tree.iter(f"{_W}del")):
        deleted.getparent().remove(deleted)
    for inserted in list(tree.iter(f"{_W}ins")):
        parent = inserted.getparent()
        index = list(parent).index(inserted)
        for child in list(inserted):
            parent.insert(index, child)
            index += 1
        parent.remove(inserted)
    return etree.tostring(tree)
