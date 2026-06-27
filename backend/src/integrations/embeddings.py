"""Local multilingual embeddings (sentence-transformers e5). $0, runs offline.

e5 models expect 'query: ' / 'passage: ' prefixes — we apply them so catalog names
(passages) and incoming raw names (queries) land in the same space.
"""
from __future__ import annotations

from src.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingModel:
    """Lazy-loaded sentence-transformer producing 1024-dim normalized vectors."""

    def __init__(self, model_name: str, enabled: bool = True):
        self.model_name = model_name
        self.enabled = enabled
        self._model = None

    @property
    def is_enabled(self) -> bool:
        """Whether semantic embeddings are turned on."""
        return self.enabled

    def _load(self):
        """Load the model on first use (import + weights are heavy)."""
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            logger.info("embedding_model_loading", model=self.model_name)
            self._model = SentenceTransformer(self.model_name)
            logger.info("embedding_model_loaded", model=self.model_name)
        return self._model

    def embed_passages(self, texts: list[str]) -> list[list[float]]:
        """Encode catalog-side texts (services/synonyms) as passages."""
        model = self._load()
        prefixed = [f"passage: {t}" for t in texts]
        vecs = model.encode(prefixed, normalize_embeddings=True, convert_to_numpy=True)
        return [v.tolist() for v in vecs]

    def embed_query(self, text: str) -> list[float]:
        """Encode an incoming raw name as a query vector."""
        model = self._load()
        vec = model.encode([f"query: {text}"], normalize_embeddings=True, convert_to_numpy=True)
        return vec[0].tolist()
