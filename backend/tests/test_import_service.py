"""Archive import: unzip → partners + stored originals + pending documents."""
import io
import zipfile

import pytest

from src.enums import ParseStatus
from src.integrations.queue import NoOpQueue
from src.integrations.storage import LocalStorage
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.import_service import ImportService, detect_format, guess_partner_name


def _make_zip() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("Клиника 1 2026.pdf", b"%PDF-1.4 fake")
        zf.writestr("Клиника 2 прайс 2025.xlsx", b"PK fake xlsx")
        zf.writestr("readme.txt", b"ignored")
    return buf.getvalue()


def test_detect_format_and_partner_name():
    assert detect_format("a.PDF").value == "pdf"
    assert detect_format("a.txt") is None
    assert guess_partner_name("Клиника 7_Прайс 2026.xls") == "Клиника 7"


@pytest.mark.asyncio
async def test_import_archive(db_session, tmp_path):
    service = ImportService(
        PartnerRepository(db_session), PriceRepository(db_session),
        LocalStorage(str(tmp_path)), NoOpQueue(),
    )
    doc_ids = await service.import_archive(_make_zip())
    await db_session.commit()

    assert len(doc_ids) == 2  # txt ignored
    docs = await service.list_documents()
    assert {d.parse_status for d in docs} == {ParseStatus.pending.value}
    assert {d.file_format for d in docs} == {"pdf", "xlsx"}
    # original bytes were stored on disk
    stored = list(tmp_path.rglob("*"))
    assert any(p.name == "Клиника 1 2026.pdf" for p in stored)
