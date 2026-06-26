"""Import service: unzip an archive into stored originals and pending documents."""
from __future__ import annotations

import io
import re
import zipfile
from datetime import date
from pathlib import Path

from src.dtos.import_dto import DocumentDTO
from src.enums import FileFormat
from src.integrations.queue import TaskQueue
from src.integrations.storage import ObjectStorage
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository

_EXT_MAP = {
    ".pdf": FileFormat.pdf,
    ".docx": FileFormat.docx,
    ".xlsx": FileFormat.xlsx,
    ".xls": FileFormat.xls,
}


def detect_format(filename: str) -> FileFormat | None:
    """Map a filename extension to a FileFormat, or None if unsupported."""
    return _EXT_MAP.get(Path(filename).suffix.lower())


def guess_partner_name(filename: str) -> str:
    """Extract a partner name from the filename ('Клиника N' or the stem)."""
    stem = Path(filename).stem
    match = re.search(r"клиника\s*\d+", stem, re.IGNORECASE)
    return match.group(0).strip() if match else stem.strip()


def guess_effective_date(filename: str) -> date | None:
    """Extract a year (20xx) from the filename and use Jan 1 as effective date."""
    match = re.search(r"20\d{2}", filename)
    return date(int(match.group(0)), 1, 1) if match else None


class ImportService:
    """Turns an uploaded ZIP into partners, stored originals, and pending documents."""

    def __init__(
        self,
        partners: PartnerRepository,
        prices: PriceRepository,
        storage: ObjectStorage,
        queue: TaskQueue,
    ):
        self.partners = partners
        self.prices = prices
        self.storage = storage
        self.queue = queue

    async def import_archive(self, archive_bytes: bytes) -> list[str]:
        """Process every supported file in the archive; return created document ids."""
        doc_ids: list[str] = []
        with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                fmt = detect_format(info.filename)
                if fmt is None:
                    continue
                data = zf.read(info)
                base_name = Path(info.filename).name
                partner_name = guess_partner_name(base_name)
                partner = await self.partners.get_by_name(partner_name)
                if partner is None:
                    partner = await self.partners.create(name=partner_name)
                key = f"{partner.id}/{base_name}"
                await self.storage.put(key, data)
                doc = await self.prices.create_document(
                    partner_id=partner.id,
                    file_name=base_name,
                    file_format=fmt,
                    object_key=key,
                    effective_date=guess_effective_date(base_name),
                )
                await self.queue.enqueue_parse(doc.id)
                doc_ids.append(doc.id)
        return doc_ids

    async def list_documents(self) -> list[DocumentDTO]:
        """Return all price documents as DTOs."""
        docs = await self.prices.list_documents()
        return [
            DocumentDTO(
                id=d.id,
                partner_id=d.partner_id,
                file_name=d.file_name,
                file_format=d.file_format.value,
                parse_status=d.parse_status.value,
                effective_date=d.effective_date,
            )
            for d in docs
        ]
