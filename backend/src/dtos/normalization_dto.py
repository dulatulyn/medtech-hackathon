"""Normalization DTOs."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class MatchResultDTO:
    """Result of matching a single price item to a catalog service."""

    service_id: str
    service_name: str
    method: str  # MatchMethod.value
    confidence: float | None = None


@dataclass
class NormalizationResultDTO:
    """Aggregate result of normalizing all unmatched items in a document."""

    doc_id: str
    matched: int
    unmatched: int
    auto_matched: int
    needs_review: int
