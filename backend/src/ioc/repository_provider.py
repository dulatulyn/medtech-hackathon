"""Repository provider for dependency injection."""

from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from src.repositories.auth_repository import AuthRepository
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository

class RepositoryProvider(Provider):
    """Provider for repository dependencies."""

    @provide(scope=Scope.REQUEST)
    def get_auth_repository(self, session: AsyncSession) -> AuthRepository:
        """Provide AuthRepository for the current request."""
        return AuthRepository(session)

    @provide(scope=Scope.REQUEST)
    def get_catalog_repository(self, session: AsyncSession) -> CatalogRepository:
        """Provide CatalogRepository for the current request."""
        return CatalogRepository(session)

    @provide(scope=Scope.REQUEST)
    def get_partner_repository(self, session: AsyncSession) -> PartnerRepository:
        """Provide PartnerRepository for the current request."""
        return PartnerRepository(session)

    @provide(scope=Scope.REQUEST)
    def get_price_repository(self, session: AsyncSession) -> PriceRepository:
        """Provide PriceRepository for the current request."""
        return PriceRepository(session)
