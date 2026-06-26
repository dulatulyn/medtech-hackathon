"""Shared domain enums."""
import enum


class FileFormat(str, enum.Enum):
    """Source document format."""

    pdf = "pdf"
    scan_pdf = "scan_pdf"
    docx = "docx"
    xlsx = "xlsx"
    xls = "xls"


class ParseStatus(str, enum.Enum):
    """Processing state of a price document."""

    pending = "pending"
    processing = "processing"
    done = "done"
    error = "error"
    needs_review = "needs_review"


class MatchMethod(str, enum.Enum):
    """How a price item was matched to a catalog service."""

    code = "code"
    exact = "exact"
    synonym = "synonym"
    fuzzy = "fuzzy"
    semantic = "semantic"
    manual = "manual"
    none = "none"


class TariffType(str, enum.Enum):
    """Pricing tier a tariff amount belongs to."""

    default = "default"
    resident = "resident"
    cis = "cis"
    far_abroad = "far_abroad"
    insurance = "insurance"
    with_vat = "with_vat"
    no_vat = "no_vat"
    partner = "partner"


class SynonymSource(str, enum.Enum):
    """Origin of a service synonym."""

    dict = "dict"
    operator = "operator"


class Currency(str, enum.Enum):
    """Supported currencies."""

    KZT = "KZT"
    USD = "USD"
    RUB = "RUB"
