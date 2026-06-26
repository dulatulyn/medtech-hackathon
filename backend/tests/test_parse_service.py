"""ParseService DB test: stored document -> persisted items + tariffs."""
import io

import openpyxl
import pytest

from src.enums import FileFormat, ParseStatus
from src.integrations.ocr import NoOpOcrProvider
from src.integrations.storage import LocalStorage
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.services.parse_service import ParseService


def _xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["№", "Наименование услуги", "Цена для граждан Республики Казахстан"])
    ws.append([1, "Прием врача", "16 600"])
    ws.append([2, "ОАК", 880])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_parse_document_persists_rows(db_session, tmp_path):
    partners = PartnerRepository(db_session)
    prices = PriceRepository(db_session)
    storage = LocalStorage(str(tmp_path))

    partner = await partners.create(name="Клиника 1")
    await storage.put("k1.xlsx", _xlsx_bytes())
    doc = await prices.create_document(
        partner_id=partner.id, file_name="k1.xlsx",
        file_format=FileFormat.xlsx, object_key="k1.xlsx",
    )
    await db_session.flush()

    service = ParseService(prices, storage, NoOpOcrProvider())
    count = await service.parse_document(doc.id)
    await db_session.commit()

    assert count == 2
    reloaded = await prices.get_document(doc.id)
    assert reloaded.parse_status == ParseStatus.done
    items = await prices.items_for_document(doc.id)
    assert {i.service_name_raw for i in items} == {"Прием врача", "ОАК"}
    await db_session.refresh(items[0], ["tariffs"])
    assert len(items[0].tariffs) >= 1
