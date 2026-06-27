"""Import/document DTOs."""
from dataclasses import dataclass
from datetime import date, datetime


@dataclass
class DocumentDTO:
    """Summary view of a price document."""

    id: str
    partner_id: str
    file_name: str
    file_format: str
    parse_status: str
    effective_date: date | None
    parse_log: str | None = None
    created_at: datetime | None = None
