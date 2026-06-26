"""Pydantic schemas for system statistics endpoints."""
from __future__ import annotations

from pydantic import BaseModel


class StatsOut(BaseModel):
    """Aggregated system statistics snapshot."""

    total_documents: int
    documents_by_status: dict[str, int]
    total_items: int
    items_matched: int
    items_unmatched: int
    match_rate_pct: float
    anomalies: int
    items_by_method: dict[str, int]
    partners_active: int
    services_count: int
