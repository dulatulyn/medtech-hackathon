"""Embedding service: populate service vectors and run semantic search."""
from __future__ import annotations

from src.core.logging import get_logger
from src.integrations.embeddings import EmbeddingModel
from src.repositories.catalog_repository import CatalogRepository

logger = get_logger(__name__)


class EmbeddingService:
    """Generates catalog embeddings and answers semantic queries via pgvector."""

    def __init__(self, model: EmbeddingModel, catalog: CatalogRepository):
        self.model = model
        self.catalog = catalog

    async def embed_catalog(self) -> int:
        """Embed every active service name and store the vector. Returns count."""
        if not self.model.is_enabled:
            raise ValueError("Embeddings are disabled (set EMBED_ENABLED=true)")
        services = await self.catalog.list_all_services()
        if not services:
            return 0
        vectors = self.model.embed_passages([s.name for s in services])
        for service, vector in zip(services, vectors):
            await self.catalog.set_embedding(service.id, vector)
        logger.info("catalog_embedded", count=len(services))
        return len(services)

    async def semantic_search(self, query: str, top_k: int = 10) -> list[dict]:
        """Return services ranked by semantic similarity to the query."""
        if not self.model.is_enabled:
            raise ValueError("Embeddings are disabled")
        vector = self.model.embed_query(query)
        results = await self.catalog.semantic_search(vector, top_k=top_k)
        return [
            {
                "service_id": s.id,
                "name": s.name,
                "category": s.category,
                "similarity": round(1.0 - dist, 3),
                "distance": round(dist, 4),
            }
            for s, dist in results
        ]
