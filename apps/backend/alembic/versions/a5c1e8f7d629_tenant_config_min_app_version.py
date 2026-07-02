"""tenant_configs.min_app_version — force-update floor for the mobile app (G8/M16).

Revision ID: a5c1e8f7d629
Revises: f2a8d9c4b317
Create Date: 2026-07-03
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "a5c1e8f7d629"
down_revision = "f2a8d9c4b317"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tenant_configs",
        sa.Column("min_app_version", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("tenant_configs", "min_app_version")
