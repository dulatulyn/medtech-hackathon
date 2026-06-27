"""Command-line entrypoint for admin tasks."""
from __future__ import annotations

import argparse
import asyncio

from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.core.config import config
from src.integrations.ocr import AzureOcrProvider, NoOpOcrProvider, OcrProvider
from src.integrations.queue import NoOpQueue
from src.integrations.storage import LocalStorage
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.catalog_service import CatalogService, parse_dictionary_file
from src.services.import_service import ImportService
from src.services.normalization_service import NormalizationService
from src.services.parse_service import ParseService
from src.services.validation_service import ValidationService


def _build_ocr() -> OcrProvider:
    """Build the OCR provider from config: Azure when a key is set, else NoOp."""
    if config.ocr.azure_key and config.ocr.azure_endpoint:
        return AzureOcrProvider(config.ocr.azure_endpoint, config.ocr.azure_key)
    return NoOpOcrProvider()


async def _import_archive(path: str) -> None:
    """Import a ZIP archive of price lists from disk."""
    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        service = ImportService(
            PartnerRepository(session), PriceRepository(session),
            LocalStorage(config.storage_dir), NoOpQueue(),
        )
        doc_ids = await service.import_archive(Path(path).read_bytes())
        await session.commit()
    await engine.dispose()
    print(f"imported {len(doc_ids)} documents from {path}")


async def _parse_pending() -> None:
    """Parse all pending documents already imported into the database."""
    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        service = ParseService(
            PriceRepository(session), LocalStorage(config.storage_dir), _build_ocr()
        )
        counts = await service.parse_pending()
        await session.commit()
    await engine.dispose()
    total = sum(c for c in counts.values() if c > 0)
    print(f"parsed {len(counts)} documents, {total} rows total")


async def _normalize_all() -> None:
    """Normalize all unmatched items across all documents."""
    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        price_repo = PriceRepository(session)
        catalog_repo = CatalogRepository(session)
        svc = NormalizationService(catalog_repo, price_repo)
        docs = await price_repo.list_documents()
        total_matched = total_unmatched = 0
        for doc in docs:
            result = await svc.normalize_document(doc.id)
            total_matched += result.matched
            total_unmatched += result.unmatched
        await session.commit()
    await engine.dispose()
    print(f"normalization done: {total_matched} matched, {total_unmatched} unmatched")


async def _normalize_doc(doc_id: str) -> None:
    """Normalize a single document by ID."""
    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        svc = NormalizationService(CatalogRepository(session), PriceRepository(session))
        result = await svc.normalize_document(doc_id)
        await session.commit()
    await engine.dispose()
    print(f"matched={result.matched} unmatched={result.unmatched}")


async def _validate_doc(doc_id: str) -> None:
    """Run validation and anomaly detection on a single document."""
    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        svc = ValidationService(PriceRepository(session))
        result = await svc.validate_document(doc_id)
        await session.commit()
    await engine.dispose()
    print(f"checked={result.checked} anomalies={result.anomalies} archived={result.archived}")


async def _load_dict(path: str) -> None:
    """Load a reference dictionary file into the database."""
    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        service = CatalogService(CatalogRepository(session))
        entries = parse_dictionary_file(path)
        count = await service.load_dictionary(entries)
        await session.commit()
    await engine.dispose()
    print(f"loaded {count} services from {path}")


async def _reindex() -> None:
    """Rebuild the Meilisearch full-text index from all active price items."""
    from src.integrations.search_index import MeiliIndex
    from src.repositories.partner_repository import PartnerRepository
    from src.services.search_service import SearchService

    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        svc = SearchService(
            MeiliIndex(config.meili.url, config.meili.key),
            PriceRepository(session), PartnerRepository(session), CatalogRepository(session),
        )
        count = await svc.reindex()
    await engine.dispose()
    print(f"reindexed {count} items into Meilisearch")


async def _seed() -> None:
    """Insert demo data (clinics, services, matched items, anomalies)."""
    from src.seed import seed_demo

    engine = create_async_engine(config.db_url)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        counts = await seed_demo(session)
    await engine.dispose()
    print("seeded:", ", ".join(f"{k}={v}" for k, v in counts.items()))


def main() -> None:
    """Parse arguments and dispatch a subcommand."""
    parser = argparse.ArgumentParser(prog="python -m src.cli")
    sub = parser.add_subparsers(dest="command", required=True)

    load = sub.add_parser("load-dict", help="load a services dictionary (JSON/XLSX)")
    load.add_argument("path")

    imp = sub.add_parser("import", help="import a ZIP archive of price lists")
    imp.add_argument("path")

    sub.add_parser("parse", help="parse all pending documents")

    sub.add_parser("normalize", help="normalize all unmatched items in all documents")

    norm_doc = sub.add_parser("normalize-doc", help="normalize a single document by ID")
    norm_doc.add_argument("doc_id")

    val = sub.add_parser("validate-doc", help="validate a document (history + anomalies)")
    val.add_argument("doc_id")

    sub.add_parser("seed", help="insert demo data (clinics, services, items)")

    sub.add_parser("reindex", help="rebuild the Meilisearch full-text index")

    args = parser.parse_args()
    if args.command == "load-dict":
        asyncio.run(_load_dict(args.path))
    elif args.command == "import":
        asyncio.run(_import_archive(args.path))
    elif args.command == "parse":
        asyncio.run(_parse_pending())
    elif args.command == "normalize":
        asyncio.run(_normalize_all())
    elif args.command == "normalize-doc":
        asyncio.run(_normalize_doc(args.doc_id))
    elif args.command == "validate-doc":
        asyncio.run(_validate_doc(args.doc_id))
    elif args.command == "seed":
        asyncio.run(_seed())
    elif args.command == "reindex":
        asyncio.run(_reindex())


if __name__ == "__main__":
    main()
