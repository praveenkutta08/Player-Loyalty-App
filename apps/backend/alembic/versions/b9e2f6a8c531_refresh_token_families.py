"""refresh_tokens.family_id — token families for reuse-detection revocation (audit M1).

Existing tokens each become their own single-member family (backfilled from jti).

Revision ID: b9e2f6a8c531
Revises: a5c1e8f7d629
Create Date: 2026-07-03
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "b9e2f6a8c531"
down_revision = "a5c1e8f7d629"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "refresh_tokens",
        sa.Column("family_id", sa.UUID(), nullable=True),
    )
    op.execute("UPDATE refresh_tokens SET family_id = jti WHERE family_id IS NULL")
    op.alter_column("refresh_tokens", "family_id", nullable=False)
    op.create_index(
        op.f("ix_refresh_tokens_family_id"), "refresh_tokens", ["family_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_refresh_tokens_family_id"), table_name="refresh_tokens")
    op.drop_column("refresh_tokens", "family_id")
