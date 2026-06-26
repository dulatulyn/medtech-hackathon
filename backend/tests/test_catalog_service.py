"""Dictionary loader: upsert services + synonyms, idempotent."""
import pytest

from src.dtos.catalog_dto import DictionaryEntryDTO
from src.repositories.catalog_repository import CatalogRepository
from src.services.catalog_service import CatalogService

ENTRIES = [
    DictionaryEntryDTO(
        name="Общий анализ крови", category="лаборатория", icd_code="B02.110.002",
        synonyms=["ОАК", "клинический анализ крови"],
    ),
    DictionaryEntryDTO(name="Прием терапевта", category="консультация", synonyms=["терапевт"]),
]


@pytest.mark.asyncio
async def test_load_dictionary_is_idempotent(db_session):
    repo = CatalogRepository(db_session)
    svc = CatalogService(repo)

    n = await svc.load_dictionary(ENTRIES)
    await db_session.commit()
    assert n == 2

    # second load must not duplicate services or synonyms
    await svc.load_dictionary(ENTRIES)
    await db_session.commit()

    service = await repo.get_by_code("B02.110.002")
    assert service is not None
    assert service.category == "лаборатория"
    texts = await repo.get_synonym_texts(service.id)
    assert texts == {"ОАК", "клинический анализ крови"}


@pytest.mark.asyncio
async def test_synonym_dedup_case_insensitive(db_session):
    repo = CatalogRepository(db_session)
    svc = CatalogService(repo)
    await svc.load_dictionary([DictionaryEntryDTO(name="X", synonyms=["ОАК"])])
    await svc.load_dictionary([DictionaryEntryDTO(name="X", synonyms=["оак", "новый"])])
    await db_session.commit()
    service = await repo.get_by_name("X")
    texts = {t.lower() for t in await repo.get_synonym_texts(service.id)}
    assert texts == {"оак", "новый"}
