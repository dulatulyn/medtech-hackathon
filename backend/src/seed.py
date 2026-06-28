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

# (name, city, active, address, phone, email, bin)
_CLINICS = [
    ("Сункар", "Алматы", True, "пр. Достык, 240", "+7 727 350 12 00", "info@sunkar.kz", "051140004821"),
    ("Жетысу", "Алматы", True, "ул. Абая, 150", "+7 727 311 45 67", "clinic@zhetysu.kz", "060240003712"),
    ("Арман", "Шымкент", True, "пр. Тауке хана, 21", "+7 7252 53 21 09", "reg@arman-med.kz", "071040008190"),
    ("Нур", "Астана", True, "пр. Кабанбай батыра, 53", "+7 7172 24 88 10", "info@nurclinic.kz", "080540002345"),
    ("Сенім", "Караганда", True, "ул. Ерубаева, 39", "+7 7212 41 60 33", "senim@mail.kz", "090340007654"),
    ("Аман", "Алматы", True, "мкр. Самал-2, 58", "+7 727 264 70 21", "aman@aman.kz", "100140001298"),
    ("Береке", "Астана", False, "ул. Сарыарка, 12", "+7 7172 50 33 18", "bereke@bereke.kz", "110540006677"),
    ("Демеу", "Шымкент", True, "ул. Желтоксан, 7", "+7 7252 99 14 02", "demeu@demeu.kz", "120340004411"),
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


async def _wipe(session: AsyncSession) -> None:
    """Clear domain tables (FK-safe order) so re-seeding gives a clean demo state.

    Only touches the price/catalog/partner domain — never auth/users.
    """
    from sqlalchemy import text

    for table in (
        "price_tariffs", "price_items", "price_documents",
        "service_synonyms", "services", "partners",
    ):
        await session.execute(text(f"DELETE FROM {table}"))
    await session.flush()


async def seed_demo(session: AsyncSession) -> dict[str, int]:
    """Insert demo clinics, services, and matched price items. Returns counts."""
    partners = PartnerRepository(session)
    catalog = CatalogRepository(session)
    prices = PriceRepository(session)

    await _wipe(session)

    partner_ids: list[str] = []
    for name, city, active, address, phone, email, bin_ in _CLINICS:
        p = await partners.create(name=name, city=city, bin=bin_)
        p.is_active = active
        p.address = address
        p.contact_phone = phone
        p.contact_email = email
        partner_ids.append(p.id)

    service_ids: list[str] = []
    for name, category, synonyms, _ in _SERVICES:
        svc = await catalog.create_service(name, category=category)
        for syn in synonyms:
            await catalog.add_synonym(svc.id, syn, SynonymSource.dict)
        service_ids.append(svc.id)
    await session.flush()

    eff = date(2026, 1, 1)
    eff_old = date(2024, 1, 1)
    items = anomalies = unmatched = archived = 0

    # Two documents per clinic (2024 archived + 2026 active) to demonstrate price
    # history/versioning; matched items carry resident + far_abroad tariffs.
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
        doc_old = await prices.create_document(
            partner_id=pid,
            file_name=f"{_CLINICS[ci][0]} прайс 2024.xlsx",
            file_format=FileFormat.xlsx,
            object_key=f"seed/{ci}_2024.xlsx",
            effective_date=eff_old,
        )
        doc_old.parse_status = ParseStatus.done
        doc_old.parse_log = "seeded"
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

            # archived 2024 version (price-history + versioning demo). High-factor
            # clinics get a steep 2024→2026 jump that trips the >50% anomaly rule.
            is_outlier = factor >= 1.35
            old_mult = Decimal("0.60") if is_outlier else Decimal("0.82")
            resident_old = (resident * old_mult).quantize(Decimal("1"))
            old_item = await prices.add_item(
                doc_id=doc_old.id, partner_id=pid, service_name_raw=sname,
                provenance={"sheet": "Прайс", "row": si + 2, "source": "seed"},
                effective_date=eff_old,
            )
            await prices.update_item_match(old_item.id, service_ids[si], MatchMethod.exact, 0.99)
            await prices.add_tariff(old_item.id, resident_old, TariffType.resident)
            old_item.is_active = False
            old_item.superseded_by = item.id
            archived += 1

            if is_outlier:
                pct = int((resident / resident_old - 1) * 100)
                await prices.set_anomaly(item.id, f"resident: {resident_old}→{resident} ({pct}%)")
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
        "archived": archived,
        "anomalies": anomalies,
        "unmatched": unmatched,
    }
