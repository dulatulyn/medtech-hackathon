"""Database provider for dependency injection."""

from typing import AsyncIterable

from dishka import Provider, Scope, from_context, provide
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, AsyncEngine, create_async_engine

from src.core.config import Config

class DatabaseProvider(Provider):
    """Provider for database-related dependencies."""

    config = from_context(provides=Config, scope=Scope.APP)

    @provide(scope=Scope.APP)
    def get_engine(self, config: Config) -> AsyncEngine:
        """Create and provide SQLAlchemy async engine."""
        return create_async_engine(
            config.db_url,
            echo=False,
            pool_pre_ping=True,
            pool_recycle=3600,
            pool_timeout=20,
            pool_size=10,
            max_overflow=10,
        )

    @provide(scope=Scope.APP)
    def get_session_maker(self, engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
        """Create and provide session maker factory."""
        return async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )

    @provide(scope=Scope.REQUEST)
    async def get_session(
        self, session_maker: async_sessionmaker[AsyncSession]
    ) -> AsyncIterable[AsyncSession]:
        """Provide database session for the current request."""
        async with session_maker() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
