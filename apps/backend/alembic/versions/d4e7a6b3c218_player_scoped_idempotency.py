"""Player-scoped idempotency keys (audit H1).

The old (tenant_id, idempotency_key) unique constraints let one player's key collide with —
and, worse, the service lookups replay — another player's transaction. Scope both to
(tenant_id, player_id, idempotency_key); the services additionally reject cross-player key
reuse with 409.

Revision ID: d4e7a6b3c218
Revises: c3f8b2a1d905
Create Date: 2026-07-02
"""

from __future__ import annotations

from alembic import op

revision = "d4e7a6b3c218"
down_revision = "c3f8b2a1d905"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_wallet_txn_tenant_id_idem", "wallet_transactions", type_="unique")
    op.create_unique_constraint(
        "uq_wallet_txn_tenant_player_idem",
        "wallet_transactions",
        ["tenant_id", "player_id", "idempotency_key"],
    )
    op.drop_constraint("uq_reward_redemptions_idem", "reward_redemptions", type_="unique")
    op.create_unique_constraint(
        "uq_reward_redemptions_tenant_player_idem",
        "reward_redemptions",
        ["tenant_id", "player_id", "idempotency_key"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_reward_redemptions_tenant_player_idem", "reward_redemptions", type_="unique"
    )
    op.create_unique_constraint(
        "uq_reward_redemptions_idem", "reward_redemptions", ["tenant_id", "idempotency_key"]
    )
    op.drop_constraint("uq_wallet_txn_tenant_player_idem", "wallet_transactions", type_="unique")
    op.create_unique_constraint(
        "uq_wallet_txn_tenant_id_idem", "wallet_transactions", ["tenant_id", "idempotency_key"]
    )
