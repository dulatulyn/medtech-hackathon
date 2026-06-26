"""Route a document to the parser for its format."""
from __future__ import annotations

from src.enums import FileFormat
from src.parsers.base import ParseResult
from src.parsers.docx import parse_docx
from src.parsers.excel import parse_excel
from src.parsers.pdf_text import parse_pdf_text


def parse_bytes(data: bytes, file_format: FileFormat) -> ParseResult:
    """Dispatch raw document bytes to the matching format parser."""
    if file_format in (FileFormat.xlsx, FileFormat.xls):
        return parse_excel(data, file_format)
    if file_format == FileFormat.docx:
        return parse_docx(data)
    if file_format in (FileFormat.pdf, FileFormat.scan_pdf):
        result = parse_pdf_text(data)
        if not result.rows and "scan_requires_ocr" not in result.warnings:
            result.warnings.append("scan_requires_ocr")  # OCR provider wired in a later step
        return result
    raise ValueError(f"unsupported format: {file_format}")
