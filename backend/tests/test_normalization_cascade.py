"""Tests for the normalization cascade — no database needed."""
from __future__ import annotations

from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from src.enums import MatchMethod
from src.normalization.cascade import MatchResult, match_service, normalize_name


def test_normalize_name_basic():
    assert normalize_name("  Общий анализ крови  ") == "общий анализ крови"


def test_normalize_name_punctuation():
    result = normalize_name("МРТ (без контраста), голова")
    assert "мрт" in result
    assert "(" not in result
    assert ")" not in result


def test_normalize_name_hyphen_kept():
    result = normalize_name("Ультра-звук")
    assert "ультра-звук" in result


@pytest.mark.asyncio
async def test_match_by_code():
    """Step 1: source code match wins."""
    from src.models.catalog import Service
    svc = Service()
    svc.id = "svc1"

    repo = AsyncMock()
    repo.get_by_code.return_value = svc
    repo.get_by_name.return_value = None
    repo.find_by_synonym.return_value = None
    repo.fuzzy_search.return_value = []

    result = await match_service("some name", "A01.01", repo)
    assert result is not None
    assert result.method == MatchMethod.code
    assert result.service_id == "svc1"
    repo.get_by_code.assert_awaited_once_with("A01.01")


@pytest.mark.asyncio
async def test_match_exact():
    """Step 2: exact name match when no code."""
    from src.models.catalog import Service
    svc = Service()
    svc.id = "svc2"

    repo = AsyncMock()
    repo.get_by_code.return_value = None
    repo.get_by_name.return_value = svc
    repo.find_by_synonym.return_value = None
    repo.fuzzy_search.return_value = []

    result = await match_service("Общий анализ крови", None, repo)
    assert result is not None
    assert result.method == MatchMethod.exact
    assert result.service_id == "svc2"


@pytest.mark.asyncio
async def test_match_synonym():
    """Step 3: synonym match when no code or exact."""
    from src.models.catalog import Service
    svc = Service()
    svc.id = "svc3"

    repo = AsyncMock()
    repo.get_by_code.return_value = None
    repo.get_by_name.return_value = None
    repo.find_by_synonym.return_value = svc
    repo.fuzzy_search.return_value = []

    result = await match_service("ОАК", None, repo)
    assert result is not None
    assert result.method == MatchMethod.synonym
    assert result.service_id == "svc3"


@pytest.mark.asyncio
async def test_match_fuzzy():
    """Step 4: fuzzy match with score above threshold."""
    from src.models.catalog import Service
    svc = Service()
    svc.id = "svc4"

    repo = AsyncMock()
    repo.get_by_code.return_value = None
    repo.get_by_name.return_value = None
    repo.find_by_synonym.return_value = None
    repo.fuzzy_search.return_value = [(svc, 0.72)]

    result = await match_service("Анализ крови общий", None, repo, threshold=0.4)
    assert result is not None
    assert result.method == MatchMethod.fuzzy
    assert result.service_id == "svc4"
    assert abs(result.confidence - 0.72) < 0.001


@pytest.mark.asyncio
async def test_match_no_match():
    """Step 5: no match when fuzzy score too low."""
    repo = AsyncMock()
    repo.get_by_code.return_value = None
    repo.get_by_name.return_value = None
    repo.find_by_synonym.return_value = None
    repo.fuzzy_search.return_value = [("svc", 0.1)]  # below threshold

    result = await match_service("Неизвестная процедура XYZ", None, repo, threshold=0.4)
    assert result is None


@pytest.mark.asyncio
async def test_match_fuzzy_below_threshold_returns_none():
    """Fuzzy candidates below threshold are rejected."""
    from src.models.catalog import Service
    svc = Service()
    svc.id = "svc5"

    repo = AsyncMock()
    repo.get_by_code.return_value = None
    repo.get_by_name.return_value = None
    repo.find_by_synonym.return_value = None
    repo.fuzzy_search.return_value = [(svc, 0.2)]  # below 0.4

    result = await match_service("random", None, repo, threshold=0.4)
    assert result is None
