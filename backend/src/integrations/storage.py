"""Object storage abstraction. Local filesystem by default; swap for S3/MinIO later."""
from __future__ import annotations

from pathlib import Path
from typing import Protocol, runtime_checkable


@runtime_checkable
class ObjectStorage(Protocol):
    """Stores and retrieves raw file bytes by key."""

    async def put(self, key: str, data: bytes) -> str: ...
    async def get(self, key: str) -> bytes: ...


class LocalStorage:
    """Filesystem-backed object storage under a base directory."""

    def __init__(self, base_dir: str):
        self.base = Path(base_dir)

    async def put(self, key: str, data: bytes) -> str:
        """Write bytes to base_dir/key and return the key."""
        path = self.base / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return key

    async def get(self, key: str) -> bytes:
        """Read bytes for a previously stored key."""
        return (self.base / key).read_bytes()
