"""Task queue abstraction. No-op by default; swap for arq/Redis when workers exist."""
from __future__ import annotations

from typing import Protocol, runtime_checkable

from src.core.logging import get_logger

logger = get_logger(__name__)


@runtime_checkable
class TaskQueue(Protocol):
    """Enqueues background jobs."""

    async def enqueue_parse(self, doc_id: str) -> None: ...


class NoOpQueue:
    """A queue that only logs; parsing is triggered manually until P4 wires arq."""

    async def enqueue_parse(self, doc_id: str) -> None:
        """Record that a parse job would be enqueued."""
        logger.info("enqueue_parse_noop", doc_id=doc_id)
