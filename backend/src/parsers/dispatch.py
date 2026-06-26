"""Route a document to the parser for its format."""
from __future__ import annotations

from src.enums import FileFormat
from src.parsers.base import ParseResult
from src.parsers.docx import parse_docx
from src.parsers.excel import parse_excel
from src.parsers.pdf_text import parse_pdf_text


_SCAN_REQUIRES_OCR = "scan_requires_ocr"


def parse_bytes(data: bytes, file_format: FileFormat) -> ParseResult:
    """Dispatch raw document bytes to the matching format parser."""
    if file_format in (FileFormat.xlsx, FileFormat.xls):
        return parse_excel(data, file_format)
    if file_format == FileFormat.docx:
        return parse_docx(data)
    if file_format in (FileFormat.pdf, FileFormat.scan_pdf):
        result = parse_pdf_text(data)
        if not result.rows and _SCAN_REQUIRES_OCR not in result.warnings:
            result.warnings.append(_SCAN_REQUIRES_OCR)
        return result
    raise ValueError(f"unsupported format: {file_format}")
