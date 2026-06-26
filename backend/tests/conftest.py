"""Pytest fixtures: isolated test database, Dishka container, HTTP client."""
from __future__ import annotations

import pytest
from dishka import make_async_container
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import src.models.auth  # noqa: F401
import src.models.catalog  # noqa: F401
import src.models.partner  # noqa: F401
import src.models.pricing  # noqa: F401
from src.core.config import Config
from src.ioc import AppProvider
from src.main import create_app
from src.models.base import Base


def _make_test_config() -> Config:
    """Build a Config pointing at a dedicated <db>_test database."""
    cfg = Config()
    cfg.database.name = f"{cfg.database.name}_test"
    return cfg


def _admin_url(cfg: Config) -> str:
    db = cfg.database
    return f"postgresql+asyncpg://{db.user}:{db.password}@{db.host}:{db.port}/postgres"


async def _ensure_database(cfg: Config) -> None:
    """Create the test database if it does not exist."""
    engine = create_async_engine(_admin_url(cfg), isolation_level="AUTOCOMMIT")
    async with engine.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :n"), {"n": cfg.database.name}
        )
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{cfg.database.name}"'))
    await engine.dispose()


@pytest.fixture
async def test_config() -> Config:
    return _make_test_config()


@pytest.fixture
async def db_engine(test_config: Config):
    """Provision a fresh schema on the test database for one test."""
    await _ensure_database(test_config)
    engine = create_async_engine(test_config.db_url)
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(db_engine) -> AsyncSession:
    """A standalone session for repository/model tests."""
    factory = async_sessionmaker(db_engine, expire_on_commit=False)
    async with factory() as session:
        yield session


@pytest.fixture
async def client(test_config: Config, db_engine) -> AsyncClient:
    """An HTTP client wired to the app with the test container."""
    container = make_async_container(AppProvider(), context={Config: test_config})
    app = create_app(container=container)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as ac:
        yield ac
    await container.close()
