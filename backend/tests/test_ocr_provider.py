"""OcrProvider seam tests — pure unit, no DB."""
import pytest

from src.integrations.ocr import (
    AzureOcrProvider,
    NoOpOcrProvider,
    OcrNotConfiguredError,
    OcrProvider,
)


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
