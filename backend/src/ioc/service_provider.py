"""Service provider for dependency injection."""

from dishka import Provider, Scope, provide

from src.core.config import Config
from src.integrations.embeddings import EmbeddingModel
from src.integrations.ocr import OcrProvider
from src.integrations.queue import TaskQueue
from src.integrations.search_index import MeiliIndex
from src.integrations.storage import ObjectStorage
from src.repositories.auth_repository import AuthRepository
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.auth_service import AuthService
from src.services.catalog_service import CatalogService
from src.services.import_service import ImportService
from src.services.embedding_service import EmbeddingService
from src.services.normalization_service import NormalizationService
from src.services.parse_service import ParseService
from src.services.search_service import SearchService
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
        self, price_repository: PriceRepository, storage: ObjectStorage, ocr: OcrProvider
    ) -> ParseService:
        """Provide ParseService for the current request."""
        return ParseService(price_repository, storage, ocr)

    @provide(scope=Scope.REQUEST)
    def get_normalization_service(
        self,
        catalog_repository: CatalogRepository,
        price_repository: PriceRepository,
        embedder: EmbeddingModel,
    ) -> NormalizationService:
        """Provide NormalizationService for the current request."""
        return NormalizationService(catalog_repository, price_repository, embedder)

    @provide(scope=Scope.REQUEST)
    def get_embedding_service(
        self, embedder: EmbeddingModel, catalog_repository: CatalogRepository
    ) -> EmbeddingService:
        """Provide the EmbeddingService for the current request."""
        return EmbeddingService(embedder, catalog_repository)

    @provide(scope=Scope.REQUEST)
    def get_validation_service(self, price_repository: PriceRepository) -> ValidationService:
        """Provide ValidationService for the current request."""
        return ValidationService(price_repository)

    @provide(scope=Scope.REQUEST)
    def get_search_service(
        self,
        meili: MeiliIndex,
        price_repository: PriceRepository,
        partner_repository: PartnerRepository,
        catalog_repository: CatalogRepository,
    ) -> SearchService:
        """Provide the Meilisearch-backed SearchService for the current request."""
        return SearchService(meili, price_repository, partner_repository, catalog_repository)
