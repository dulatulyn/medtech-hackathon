"""Partner (clinic) model."""
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, ULIDMixin


class Partner(ULIDMixin, TimestampMixin, Base):
    """A partner clinic that provides priced services."""

    __tablename__ = "partners"

    name: Mapped[str] = mapped_column(String(300), index=True, nullable=False)
    city: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    bin: Mapped[str | None] = mapped_column(String(12), index=True, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
