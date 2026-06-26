"""Command-line entrypoint for admin tasks."""
from __future__ import annotations

import argparse
import asyncio

from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from src.core.config import config
from src.integrations.queue import NoOpQueue
from src.integrations.storage import LocalStorage
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.catalog_service import CatalogService, parse_dictionary_file
from src.services.import_service import ImportService
from src.services.parse_service import ParseService


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
        service = ParseService(PriceRepository(session), LocalStorage(config.storage_dir))
        counts = await service.parse_pending()
        await session.commit()
    await engine.dispose()
    total = sum(c for c in counts.values() if c > 0)
    print(f"parsed {len(counts)} documents, {total} rows total")


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


def main() -> None:
    """Parse arguments and dispatch a subcommand."""
    parser = argparse.ArgumentParser(prog="python -m src.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    load = sub.add_parser("load-dict", help="load a services dictionary (JSON/XLSX)")
    load.add_argument("path")
    imp = sub.add_parser("import", help="import a ZIP archive of price lists")
    imp.add_argument("path")
    sub.add_parser("parse", help="parse all pending documents")

    args = parser.parse_args()
    if args.command == "load-dict":
        asyncio.run(_load_dict(args.path))
    elif args.command == "import":
        asyncio.run(_import_archive(args.path))
    elif args.command == "parse":
        asyncio.run(_parse_pending())


if __name__ == "__main__":
    main()
