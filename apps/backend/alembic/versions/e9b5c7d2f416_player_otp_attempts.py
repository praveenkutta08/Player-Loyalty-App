"""player_otps.attempts — wrong-code counter for OTP brute-force caps (audit H4).

Revision ID: e9b5c7d2f416
Revises: d4e7a6b3c218
Create Date: 2026-07-03
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "e9b5c7d2f416"
down_revision = "d4e7a6b3c218"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "player_otps",
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade() -> None:
    op.drop_column("player_otps", "attempts")
