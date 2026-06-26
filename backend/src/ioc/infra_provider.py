"""Infrastructure provider: object storage and task queue."""
from dishka import Provider, Scope, provide

from src.core.config import Config
from src.integrations.queue import NoOpQueue, TaskQueue
from src.integrations.storage import LocalStorage, ObjectStorage


class InfraProvider(Provider):
    """Provider for storage and queue singletons."""

    @provide(scope=Scope.APP)
    def get_storage(self, config: Config) -> ObjectStorage:
        """Provide the object storage backend."""
        return LocalStorage(config.storage_dir)

    @provide(scope=Scope.APP)
    def get_queue(self) -> TaskQueue:
        """Provide the background task queue."""
        return NoOpQueue()
