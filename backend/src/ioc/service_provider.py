"""Service provider for dependency injection."""

from dishka import Provider, Scope, provide

from src.core.config import Config
from src.integrations.queue import TaskQueue
from src.integrations.storage import ObjectStorage
from src.repositories.auth_repository import AuthRepository
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.auth_service import AuthService
from src.services.catalog_service import CatalogService
from src.services.import_service import ImportService
from src.services.normalization_service import NormalizationService
from src.services.parse_service import ParseService
from src.services.validation_service import ValidationService


class ServiceProvider(Provider):
    """Provider for service dependencies."""

    @provide(scope=Scope.REQUEST)
    def get_auth_service(
        self, auth_repository: AuthRepository, config: Config
    ) -> AuthService:
        """Provide AuthService for the current request."""
        return AuthService(auth_repository, config)

    @provide(scope=Scope.REQUEST)
    def get_catalog_service(self, catalog_repository: CatalogRepository) -> CatalogService:
        """Provide CatalogService for the current request."""
        return CatalogService(catalog_repository)

    @provide(scope=Scope.REQUEST)
    def get_import_service(
        self,
        partner_repository: PartnerRepository,
        price_repository: PriceRepository,
        storage: ObjectStorage,
        queue: TaskQueue,
    ) -> ImportService:
        """Provide ImportService for the current request."""
        return ImportService(partner_repository, price_repository, storage, queue)

    @provide(scope=Scope.REQUEST)
    def get_parse_service(
        self, price_repository: PriceRepository, storage: ObjectStorage
    ) -> ParseService:
        """Provide ParseService for the current request."""
        return ParseService(price_repository, storage)

    @provide(scope=Scope.REQUEST)
    def get_normalization_service(
        self, catalog_repository: CatalogRepository, price_repository: PriceRepository
    ) -> NormalizationService:
        """Provide NormalizationService for the current request."""
        return NormalizationService(catalog_repository, price_repository)

    @provide(scope=Scope.REQUEST)
    def get_validation_service(self, price_repository: PriceRepository) -> ValidationService:
        """Provide ValidationService for the current request."""
        return ValidationService(price_repository)
