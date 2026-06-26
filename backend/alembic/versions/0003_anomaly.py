"""add anomaly fields to price_items"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_anomaly"
down_revision: Union[str, None] = "0002_domain"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("price_items", sa.Column("is_anomaly", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("price_items", sa.Column("anomaly_reason", sa.String(500), nullable=True))
    op.create_index("ix_price_items_is_anomaly", "price_items", ["is_anomaly"])


def downgrade() -> None:
    op.drop_index("ix_price_items_is_anomaly", table_name="price_items")
    op.drop_column("price_items", "anomaly_reason")
    op.drop_column("price_items", "is_anomaly")
