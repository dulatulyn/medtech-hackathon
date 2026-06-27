"""Normalization cascade: maps a raw service name to a catalog Service record."""
from __future__ import annotations

import re
from dataclasses import dataclass

from src.core.logging import get_logger
from src.enums import MatchMethod
from src.repositories.catalog_repository import CatalogRepository

logger = get_logger(__name__)


@dataclass
class MatchResult:
    """Outcome of a single cascade match attempt."""

    service_id: str
    method: MatchMethod
    confidence: float | None = None


def normalize_name(text: str) -> str:
    """Lowercase, strip, collapse whitespace, remove punctuation except hyphens."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


async def match_service(
    raw_name: str,
    source_code: str | None,
    catalog_repo: CatalogRepository,
    threshold: float = 0.4,
    embedder=None,
    semantic_max_distance: float = 0.12,
) -> MatchResult | None:
    """Run the normalization cascade for a single raw service name.

    If ``embedder`` is provided (has ``embed_query``), step 5 runs a pgvector
    semantic search and accepts the nearest service within ``semantic_max_distance``.
    """
    # Step 1: source code match
    if source_code:
        service = await catalog_repo.get_by_code(source_code)
        if service:
            logger.info("cascade_match", method=MatchMethod.code, service_id=service.id)
            return MatchResult(service_id=service.id, method=MatchMethod.code)

    normalized = normalize_name(raw_name)

    # Step 2: exact normalized name match
    service = await catalog_repo.get_by_name(normalized)
    if service:
        logger.info("cascade_match", method=MatchMethod.exact, service_id=service.id)
        return MatchResult(service_id=service.id, method=MatchMethod.exact)

    # Step 3: synonym text match
    service = await catalog_repo.find_by_synonym(normalized)
    if service:
        logger.info("cascade_match", method=MatchMethod.synonym, service_id=service.id)
        return MatchResult(service_id=service.id, method=MatchMethod.synonym)

    # Step 4: pg_trgm fuzzy match
    candidates = await catalog_repo.fuzzy_search(normalized, limit=5)
    if candidates:
        best_service, best_score = candidates[0]
        if best_score >= threshold:
            logger.info(
                "cascade_match",
                method=MatchMethod.fuzzy,
                service_id=best_service.id,
                score=best_score,
            )
            return MatchResult(
                service_id=best_service.id,
                method=MatchMethod.fuzzy,
                confidence=best_score,
            )

    # Step 5: pgvector semantic match (local embeddings)
    if embedder is not None and getattr(embedder, "is_enabled", True):
        try:
            vector = embedder.embed_query(raw_name)
            results = await catalog_repo.semantic_search(vector, top_k=3)
            if results:
                best_service, best_dist = results[0]
                if best_dist <= semantic_max_distance:
                    confidence = round(1.0 - best_dist, 3)
                    logger.info(
                        "cascade_match",
                        method=MatchMethod.semantic,
                        service_id=best_service.id,
                        distance=best_dist,
                    )
                    return MatchResult(
                        service_id=best_service.id,
                        method=MatchMethod.semantic,
                        confidence=confidence,
                    )
        except Exception as exc:  # noqa: BLE001 - semantic step is best-effort
            logger.warning("semantic_step_failed", error=str(exc))

    logger.info("cascade_no_match", reason="needs_semantic", raw_name=raw_name)
    return None
