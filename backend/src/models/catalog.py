"""Catalog models: reference services and their synonyms."""
from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.enums import SynonymSource
from src.models.base import Base, TimestampMixin, ULIDMixin


class Service(ULIDMixin, TimestampMixin, Base):
    """A canonical service in the reference dictionary."""

    __tablename__ = "services"
    __table_args__ = (
        Index("ix_services_name_trgm", "name", postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"}),
        Index("ix_services_embedding_hnsw", "embedding", postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"}),
    )

    name: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    category: Mapped[str | None] = mapped_column(String(200), nullable=True)
    icd_code: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    synonyms: Mapped[list["ServiceSynonym"]] = relationship(
        back_populates="service", cascade="all, delete-orphan"
    )


class ServiceSynonym(ULIDMixin, TimestampMixin, Base):
    """An alternative name for a service; powers self-learning normalization."""

    __tablename__ = "service_synonyms"
    __table_args__ = (
        Index("ix_service_synonyms_text_trgm", "text", postgresql_using="gin", postgresql_ops={"text": "gin_trgm_ops"}),
    )

    service_id: Mapped[str] = mapped_column(ForeignKey("services.id"), index=True, nullable=False)
    text: Mapped[str] = mapped_column(String(500), index=True, nullable=False)
    source: Mapped[SynonymSource] = mapped_column(SAEnum(SynonymSource), default=SynonymSource.dict)

    service: Mapped["Service"] = relationship(back_populates="synonyms")
