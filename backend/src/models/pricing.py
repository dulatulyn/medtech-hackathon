"""Pricing models: documents, items, and per-item tariffs."""
from datetime import date
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.enums import Currency, FileFormat, MatchMethod, ParseStatus, TariffType
from src.models.base import Base, TimestampMixin, ULIDMixin


class PriceDocument(ULIDMixin, TimestampMixin, Base):
    """One uploaded price list for a partner on a given date."""

    __tablename__ = "price_documents"

    partner_id: Mapped[str] = mapped_column(ForeignKey("partners.id"), index=True, nullable=False)
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_format: Mapped[FileFormat] = mapped_column(SAEnum(FileFormat), nullable=False)
    object_key: Mapped[str] = mapped_column(String(500), nullable=False)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    parse_status: Mapped[ParseStatus] = mapped_column(
        SAEnum(ParseStatus), default=ParseStatus.pending, index=True
    )
    parse_log: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_ref: Mapped[str | None] = mapped_column(Text, nullable=True)


class PriceItem(ULIDMixin, TimestampMixin, Base):
    """A single service line extracted from a price document."""

    __tablename__ = "price_items"

    doc_id: Mapped[str] = mapped_column(ForeignKey("price_documents.id"), index=True, nullable=False)
    partner_id: Mapped[str] = mapped_column(ForeignKey("partners.id"), index=True, nullable=False)
    service_name_raw: Mapped[str] = mapped_column(String(1000), nullable=False)
    service_code_source: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    service_id: Mapped[str | None] = mapped_column(ForeignKey("services.id"), index=True, nullable=True)
    match_method: Mapped[MatchMethod] = mapped_column(SAEnum(MatchMethod), default=MatchMethod.none)
    match_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    effective_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    superseded_by: Mapped[str | None] = mapped_column(String(26), nullable=True)
    provenance: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    tariffs: Mapped[list["PriceTariff"]] = relationship(
        back_populates="item", cascade="all, delete-orphan"
    )


class PriceTariff(ULIDMixin, TimestampMixin, Base):
    """One price amount for a price item under a specific tariff tier."""

    __tablename__ = "price_tariffs"

    item_id: Mapped[str] = mapped_column(ForeignKey("price_items.id"), index=True, nullable=False)
    tariff_type: Mapped[TariffType] = mapped_column(SAEnum(TariffType), default=TariffType.default)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[Currency] = mapped_column(SAEnum(Currency), default=Currency.KZT)
    original_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    item: Mapped["PriceItem"] = relationship(back_populates="tariffs")
