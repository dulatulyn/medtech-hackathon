"""Validation DTOs."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ValidationResultDTO:
    """Summary of a document validation run."""

    doc_id: str
    checked: int
    anomalies: int
    archived: int
    errors: int
    warnings: list[str] = field(default_factory=list)
