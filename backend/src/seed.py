"""Demo data seeder: clinics, catalog services, matched price items, anomalies.

Idempotent-ish for demos: intended to run against a fresh/empty database. Produces
data that exercises every read endpoint (services, partners, search, unmatched,
price-compare, anomalies, stats) so the frontend can be wired end-to-end.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.enums import (
    Currency,
    FileFormat,
    MatchMethod,
    ParseStatus,
    SynonymSource,
    TariffType,
)
from src.repositories.catalog_repository import CatalogRepository
from src.repositories.partner_repository import PartnerRepository
from src.repositories.price_repository import PriceRepository

# (name, city, active)
_CLINICS = [
    ("Сункар", "Алматы", True),
    ("Жетысу", "Алматы", True),
    ("Арман", "Шымкент", True),
    ("Нур", "Астана", True),
    ("Сенім", "Караганда", True),
    ("Аман", "Алматы", True),
    ("Береке", "Астана", False),
    ("Демеу", "Шымкент", True),
]

# (name, category, synonyms, base_resident_price)
_SERVICES = [
    ("МРТ головного мозга", "Диагностика", ["МРТ мозга", "МРТ ГМ"], 22600),
    ("Общий анализ крови", "Лаборатория", ["ОАК", "анализ крови общий"], 2200),
    ("УЗИ брюшной полости", "Диагностика", ["УЗИ ОБП", "УЗИ живота"], 9600),
    ("Консультация терапевта", "Консультация", ["Приём терапевта"], 6400),
    ("КТ грудной клетки", "Диагностика", ["КТ ОГК", "КТ лёгких"], 27000),
    ("Биохимический анализ крови", "Лаборатория", ["Биохимия", "БАК"], 7800),
    ("Электрокардиография", "Диагностика", ["ЭКГ"], 3900),
    ("Рентгенография грудной клетки", "Диагностика", ["Рентген ОГК", "флюорография"], 4600),
]

# raw names with no catalog match yet -> populate the verification queue
_UNMATCHED = [
    ("Глюкоза кр. натощак", 0),
    ("Т4 свободный", 5),
    ("Холтер ЭКГ 24ч", 1),
    ("Соскоб на демодекс", 4),
]

# price multiplier per clinic index -> drives inter-clinic comparison + anomalies
_CLINIC_FACTOR = [0.84, 1.08, 1.38, 1.18, 0.90, 1.02, 1.0, 1.15]


async def seed_demo(session: AsyncSession) -> dict[str, int]:
    """Insert demo clinics, services, and matched price items. Returns counts."""
    partners = PartnerRepository(session)
    catalog = CatalogRepository(session)
    prices = PriceRepository(session)

    partner_ids: list[str] = []
    for name, city, active in _CLINICS:
        p = await partners.create(name=name, city=city)
        p.is_active = active
        partner_ids.append(p.id)

    service_ids: list[str] = []
    for name, category, synonyms, _ in _SERVICES:
        svc = await catalog.create_service(name, category=category)
        for syn in synonyms:
            await catalog.add_synonym(svc.id, syn, SynonymSource.dict)
        service_ids.append(svc.id)
    await session.flush()

    eff = date(2026, 1, 1)
    items = anomalies = unmatched = 0

    # One document per clinic; matched items with resident + far_abroad tariffs.
    for ci, pid in enumerate(partner_ids):
        status = ParseStatus.done if ci != 6 else ParseStatus.needs_review
        doc = await prices.create_document(
            partner_id=pid,
            file_name=f"{_CLINICS[ci][0]} прайс 2026.xlsx",
            file_format=FileFormat.xlsx,
            object_key=f"seed/{ci}.xlsx",
            effective_date=eff,
        )
        doc.parse_status = status
        doc.parse_log = "seeded"
        factor = _CLINIC_FACTOR[ci]

        for si, (sname, _, _, base) in enumerate(_SERVICES):
            # not every clinic offers every service
            if (ci + si) % 5 == 4:
                continue
            resident = Decimal(int(base * factor))
            item = await prices.add_item(
                doc_id=doc.id, partner_id=pid, service_name_raw=sname,
                provenance={"sheet": "Прайс", "row": si + 2, "source": "seed"},
                effective_date=eff,
            )
            await prices.update_item_match(item.id, service_ids[si], MatchMethod.exact, 0.99)
            await prices.add_tariff(item.id, resident, TariffType.resident)
            await prices.add_tariff(item.id, resident * Decimal("1.15"), TariffType.far_abroad)
            items += 1
            # flag clear outliers as anomalies
            if factor >= 1.35:
                await prices.set_anomaly(
                    item.id, f"Цена выше медианы рынка (+{int((factor - 1) * 100)}%)"
                )
                anomalies += 1

        # a couple of unmatched raw items per relevant clinic
        for raw, target_ci in _UNMATCHED:
            if target_ci == ci:
                u = await prices.add_item(
                    doc_id=doc.id, partner_id=pid, service_name_raw=raw,
                    provenance={"sheet": "Прайс", "source": "seed"}, effective_date=eff,
                )
                await prices.add_tariff(u.id, Decimal("5000"), TariffType.resident)
                unmatched += 1

    await session.commit()
    return {
        "clinics": len(partner_ids),
        "services": len(service_ids),
        "items": items,
        "anomalies": anomalies,
        "unmatched": unmatched,
    }
