"""Domain model round-trip: partner, service+synonyms, document, item, tariffs."""
from decimal import Decimal

import pytest

from src.enums import SynonymSource, TariffType
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository
from src.enums import FileFormat


@pytest.mark.asyncio
async def test_full_pricing_round_trip(db_session):
    partners = PartnerRepository(db_session)
    catalog = CatalogRepository(db_session)
    prices = PriceRepository(db_session)

    partner = await partners.create(name="Клиника 1", city="Алматы", bin="123456789012")
    service = await catalog.create_service(name="Общий анализ крови", category="лаборатория", icd_code="B02.110.002")
    await catalog.add_synonym(service.id, "ОАК", source=SynonymSource.dict)
    await catalog.add_synonym(service.id, "клинический анализ крови", source=SynonymSource.operator)

    doc = await prices.create_document(
        partner_id=partner.id, file_name="k1.pdf", file_format=FileFormat.pdf, object_key="raw/k1.pdf",
    )
    item = await prices.add_item(
        doc_id=doc.id, partner_id=partner.id, service_name_raw="ОАК без СОЭ",
        service_code_source="B02.110.002", provenance={"page": 1, "row": 5, "raw_text": "ОАК без СОЭ 880"},
    )
    await prices.add_tariff(item.id, Decimal("880.00"), tariff_type=TariffType.resident)
    await prices.add_tariff(item.id, Decimal("1410.00"), tariff_type=TariffType.far_abroad)
    await db_session.commit()

    fetched = await prices.get_document(doc.id)
    assert fetched is not None
    items = await prices.items_for_document(doc.id)
    assert len(items) == 1
    assert items[0].provenance["row"] == 5

    reloaded = await catalog.get_by_code("B02.110.002")
    assert reloaded is not None
    await db_session.refresh(reloaded, ["synonyms"])
    assert {s.text for s in reloaded.synonyms} == {"ОАК", "клинический анализ крови"}

    await db_session.refresh(items[0], ["tariffs"])
    assert {t.tariff_type for t in items[0].tariffs} == {TariffType.resident, TariffType.far_abroad}
