"""domain schema: partners, services, price documents/items/tariffs"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects.postgresql import JSONB

from src.enums import Currency, FileFormat, MatchMethod, ParseStatus, SynonymSource, TariffType

revision: str = "0002_domain"
down_revision: Union[str, None] = "0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TS = [
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "services",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("category", sa.String(200), nullable=True),
        sa.Column("icd_code", sa.String(50), nullable=True),
        sa.Column("embedding", Vector(1024), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_TS,
    )
    op.create_index("ix_services_name", "services", ["name"])
    op.create_index("ix_services_icd_code", "services", ["icd_code"])
    op.create_index("ix_services_name_trgm", "services", ["name"], postgresql_using="gin", postgresql_ops={"name": "gin_trgm_ops"})
    op.create_index("ix_services_embedding_hnsw", "services", ["embedding"], postgresql_using="hnsw", postgresql_ops={"embedding": "vector_cosine_ops"})

    op.create_table(
        "service_synonyms",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("service_id", sa.String(26), sa.ForeignKey("services.id"), nullable=False),
        sa.Column("text", sa.String(500), nullable=False),
        sa.Column("source", sa.Enum(SynonymSource, name="synonymsource"), nullable=False, server_default=SynonymSource.dict.value),
        *_TS,
    )
    op.create_index("ix_service_synonyms_service_id", "service_synonyms", ["service_id"])
    op.create_index("ix_service_synonyms_text", "service_synonyms", ["text"])
    op.create_index("ix_service_synonyms_text_trgm", "service_synonyms", ["text"], postgresql_using="gin", postgresql_ops={"text": "gin_trgm_ops"})

    op.create_table(
        "partners",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("name", sa.String(300), nullable=False),
        sa.Column("city", sa.String(120), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("bin", sa.String(12), nullable=True),
        sa.Column("contact_email", sa.String(200), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        *_TS,
    )
    op.create_index("ix_partners_name", "partners", ["name"])
    op.create_index("ix_partners_city", "partners", ["city"])
    op.create_index("ix_partners_bin", "partners", ["bin"])

    op.create_table(
        "price_documents",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("partner_id", sa.String(26), sa.ForeignKey("partners.id"), nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("file_format", sa.Enum(FileFormat, name="fileformat"), nullable=False),
        sa.Column("object_key", sa.String(500), nullable=False),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("parse_status", sa.Enum(ParseStatus, name="parsestatus"), nullable=False, server_default=ParseStatus.pending.value),
        sa.Column("parse_log", sa.Text(), nullable=True),
        sa.Column("raw_ref", sa.Text(), nullable=True),
        *_TS,
    )
    op.create_index("ix_price_documents_partner_id", "price_documents", ["partner_id"])
    op.create_index("ix_price_documents_parse_status", "price_documents", ["parse_status"])

    op.create_table(
        "price_items",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("doc_id", sa.String(26), sa.ForeignKey("price_documents.id"), nullable=False),
        sa.Column("partner_id", sa.String(26), sa.ForeignKey("partners.id"), nullable=False),
        sa.Column("service_name_raw", sa.String(1000), nullable=False),
        sa.Column("service_code_source", sa.String(100), nullable=True),
        sa.Column("service_id", sa.String(26), sa.ForeignKey("services.id"), nullable=True),
        sa.Column("match_method", sa.Enum(MatchMethod, name="matchmethod"), nullable=False, server_default=MatchMethod.none.value),
        sa.Column("match_confidence", sa.Float(), nullable=True),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("verification_note", sa.String(500), nullable=True),
        sa.Column("effective_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("superseded_by", sa.String(26), nullable=True),
        sa.Column("provenance", JSONB(), nullable=True),
        *_TS,
    )
    op.create_index("ix_price_items_doc_id", "price_items", ["doc_id"])
    op.create_index("ix_price_items_partner_id", "price_items", ["partner_id"])
    op.create_index("ix_price_items_service_code_source", "price_items", ["service_code_source"])
    op.create_index("ix_price_items_service_id", "price_items", ["service_id"])
    op.create_index("ix_price_items_is_active", "price_items", ["is_active"])

    op.create_table(
        "price_tariffs",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("item_id", sa.String(26), sa.ForeignKey("price_items.id"), nullable=False),
        sa.Column("tariff_type", sa.Enum(TariffType, name="tarifftype"), nullable=False, server_default=TariffType.default.value),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.Enum(Currency, name="currency"), nullable=False, server_default=Currency.KZT.value),
        sa.Column("original_amount", sa.Numeric(12, 2), nullable=True),
        *_TS,
    )
    op.create_index("ix_price_tariffs_item_id", "price_tariffs", ["item_id"])


def downgrade() -> None:
    op.drop_table("price_tariffs")
    op.drop_table("price_items")
    op.drop_table("price_documents")
    op.drop_table("partners")
    op.drop_table("service_synonyms")
    op.drop_table("services")
    for t in ("currency", "tarifftype", "matchmethod", "parsestatus", "fileformat", "synonymsource"):
        op.execute(f"DROP TYPE IF EXISTS {t}")
