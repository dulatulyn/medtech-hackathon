"""OcrProvider seam tests — pure unit, no DB."""
import pytest

from src.integrations.ocr import (
    AzureOcrProvider,
    CachingOcrProvider,
    NoOpOcrProvider,
    OcrNotConfiguredError,
    OcrProvider,
)


class _CountingOcr:
    """Inner OCR stub that counts how many times it actually runs."""

    calls = 0
    is_configured = True

    async def extract_text(self, data: bytes) -> str:
        self.calls += 1
        return f"text for {len(data)} bytes"


@pytest.mark.asyncio
async def test_caching_runs_ocr_once_then_serves_from_cache(tmp_path):
    inner = _CountingOcr()
    provider = CachingOcrProvider(inner, str(tmp_path))
    first = await provider.extract_text(b"scan-bytes")
    second = await provider.extract_text(b"scan-bytes")  # same file → cache hit
    assert first == second
    assert inner.calls == 1  # OCR backend hit exactly once


@pytest.mark.asyncio
async def test_caching_survives_new_instance(tmp_path):
    """A fresh provider (after restart/wipe) still reads the on-disk cache."""
    inner1 = _CountingOcr()
    await CachingOcrProvider(inner1, str(tmp_path)).extract_text(b"scan")
    inner2 = _CountingOcr()
    await CachingOcrProvider(inner2, str(tmp_path)).extract_text(b"scan")
    assert inner2.calls == 0  # served from disk cache, no OCR call


def test_noop_is_not_configured():
    assert NoOpOcrProvider().is_configured is False


@pytest.mark.asyncio
async def test_noop_extract_raises():
    with pytest.raises(OcrNotConfiguredError):
        await NoOpOcrProvider().extract_text(b"scan")


def test_azure_unconfigured_without_credentials():
    assert AzureOcrProvider(endpoint="", key="").is_configured is False
    assert AzureOcrProvider(endpoint="https://x", key="").is_configured is False


def test_azure_configured_with_credentials():
    assert AzureOcrProvider(endpoint="https://x", key="secret").is_configured is True


def test_azure_extract_is_coroutine():
    """extract_text is implemented as an async call into Azure Document Intelligence."""
    import inspect

    provider = AzureOcrProvider(endpoint="https://x", key="secret")
    assert inspect.iscoroutinefunction(provider.extract_text)


def test_providers_satisfy_protocol():
    assert isinstance(NoOpOcrProvider(), OcrProvider)
    assert isinstance(AzureOcrProvider(endpoint="https://x", key="k"), OcrProvider)
