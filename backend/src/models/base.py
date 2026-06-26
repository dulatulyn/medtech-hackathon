"""Base classes and mixins for SQLAlchemy models."""

from datetime import datetime
from ulid import ULID

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase

class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""

    type_annotation_map = {
        datetime: DateTime(timezone=True),
    }

class TimestampMixin:
    """Mixin for models that need created_at and updated_at timestamps."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

class ULIDMixin:
    """Mixin for models that use ULID as primary key."""

    id: Mapped[str] = mapped_column(
        String(26),
        primary_key=True,
        default=lambda: str(ULID()),
        nullable=False
    )
