"""Infrastructure provider: object storage and task queue."""
from dishka import Provider, Scope, provide

from src.core.config import Config
from src.integrations.ocr import AzureOcrProvider, NoOpOcrProvider, OcrProvider
from src.integrations.queue import NoOpQueue, TaskQueue
from src.integrations.search_index import MeiliIndex
from src.integrations.storage import LocalStorage, ObjectStorage


class InfraProvider(Provider):
    """Provider for storage, queue, and OCR singletons."""

    @provide(scope=Scope.APP)
    def get_storage(self, config: Config) -> ObjectStorage:
        """Provide the object storage backend."""
        return LocalStorage(config.storage_dir)

    @provide(scope=Scope.APP)
    def get_queue(self) -> TaskQueue:
        """Provide the background task queue."""
        return NoOpQueue()

    @provide(scope=Scope.APP)
    def get_meili(self, config: Config) -> MeiliIndex:
        """Provide the Meilisearch index client (NoOp when MEILI_URL is unset)."""
        return MeiliIndex(config.meili.url, config.meili.key)

    @provide(scope=Scope.APP)
    def get_ocr(self, config: Config) -> OcrProvider:
        """Provide the OCR backend: Azure when a key is set, else a NoOp stub."""
        if config.ocr.azure_key and config.ocr.azure_endpoint:
            return AzureOcrProvider(config.ocr.azure_endpoint, config.ocr.azure_key)
        return NoOpOcrProvider()
