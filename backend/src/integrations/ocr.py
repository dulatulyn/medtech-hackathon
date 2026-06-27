"""OCR provider abstraction. NoOp by default; swap for Azure/Paddle when a key is set."""
from __future__ import annotations

from typing import Protocol, runtime_checkable


class OcrNotConfiguredError(RuntimeError):
    """Raised when OCR is requested but no provider is configured."""


@runtime_checkable
class OcrProvider(Protocol):
    """Extracts a plain-text layer from scanned document bytes."""

    @property
    def is_configured(self) -> bool: ...

    async def extract_text(self, data: bytes) -> str: ...


class NoOpOcrProvider:
    """Placeholder used in infra-light mode when no OCR backend is wired."""

    name = "noop"

    @property
    def is_configured(self) -> bool:
        """Always unconfigured — callers should fall back to manual review."""
        return False

    async def extract_text(self, data: bytes) -> str:
        """Refuse: no OCR backend available."""
        raise OcrNotConfiguredError("no OCR provider configured")


class AzureOcrProvider:
    """Azure Document Intelligence (Read) backend. Configured when key + endpoint set.

    The HTTP call is intentionally deferred — this is the pluggable seam. As soon as a
    key is present the parse pipeline will route scans here instead of needs_review.
    """

    name = "azure"

    def __init__(self, endpoint: str, key: str):
        self.endpoint = endpoint
        self.key = key

    @property
    def is_configured(self) -> bool:
        """Configured only when both endpoint and key are present."""
        return bool(self.endpoint and self.key)

    async def extract_text(self, data: bytes) -> str:
        """Call Azure Document Intelligence (prebuilt-read) and return the text layer.

        Runs the synchronous SDK in a worker thread: the async/aiohttp transport
        hits SSL issues on some hosts, while the sync transport uses the standard
        requests/certifi stack that works everywhere.
        """
        import asyncio

        return await asyncio.to_thread(self._extract_sync, data)

    def _extract_sync(self, data: bytes) -> str:
        """Blocking Azure Document Intelligence call (prebuilt-read)."""
        from azure.ai.documentintelligence import DocumentIntelligenceClient
        from azure.core.credentials import AzureKeyCredential

        with DocumentIntelligenceClient(
            endpoint=self.endpoint, credential=AzureKeyCredential(self.key)
        ) as client:
            poller = client.begin_analyze_document(
                "prebuilt-read", body=data, content_type="application/octet-stream"
            )
            result = poller.result()
            return result.content or ""
