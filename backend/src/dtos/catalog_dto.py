"""Catalog DTOs."""
from dataclasses import dataclass, field


@dataclass
class DictionaryEntryDTO:
    """One reference-dictionary service with its synonyms."""

    name: str
    category: str | None = None
    icd_code: str | None = None
    synonyms: list[str] = field(default_factory=list)
