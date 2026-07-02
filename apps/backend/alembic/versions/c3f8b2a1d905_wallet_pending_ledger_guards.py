"""Wallet pending-first ledger guards (audit C2).

Two trigger changes on wallet_transactions:

1. `prevent_wallet_txn_mutation` now permits exactly ONE update shape — the settlement
   transition `pending -> completed|failed` with every money field frozen (external_ref may be
   set, updated_at moves). Everything else stays append-only, DELETE always rejected.
2. New `wallet_txn_no_overdraft` BEFORE INSERT trigger: a debit may not push the wallet's
   *available* balance (completed rows + pending debits) below zero. The app serializes money
   flows with a wallet row lock; this is the DB-level backstop for any path that skips it.

Revision ID: c3f8b2a1d905
Revises: b7c4a9d21e03
Create Date: 2026-07-02
"""

from __future__ import annotations

from alembic import op

revision = "c3f8b2a1d905"
down_revision = "b7c4a9d21e03"
branch_labels = None
depends_on = None

SETTLEMENT_AWARE_MUTATION_GUARD = """
CREATE OR REPLACE FUNCTION prevent_wallet_txn_mutation() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'wallet_transactions is append-only';
    END IF;
    IF OLD.status = 'pending'
       AND NEW.status IN ('completed', 'failed')
       AND NEW.id = OLD.id
       AND NEW.tenant_id = OLD.tenant_id
       AND NEW.wallet_id = OLD.wallet_id
       AND NEW.player_id = OLD.player_id
       AND NEW.type = OLD.type
       AND NEW.amount_cents = OLD.amount_cents
       AND NEW.idempotency_key = OLD.idempotency_key
       AND NEW.created_at = OLD.created_at
       AND NEW.egm_id IS NOT DISTINCT FROM OLD.egm_id
    THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION
        'wallet_transactions is append-only (only pending -> completed/failed settlement may update a row)';
END;
$$ LANGUAGE plpgsql;
"""

ORIGINAL_MUTATION_GUARD = """
CREATE OR REPLACE FUNCTION prevent_wallet_txn_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'wallet_transactions is append-only';
END;
$$ LANGUAGE plpgsql;
"""

OVERDRAFT_GUARD_FUNCTION = """
CREATE OR REPLACE FUNCTION enforce_wallet_no_overdraft() RETURNS trigger AS $$
DECLARE
    available BIGINT;
BEGIN
    IF NEW.amount_cents >= 0 THEN
        RETURN NEW;
    END IF;
    SELECT COALESCE(SUM(amount_cents), 0) INTO available
      FROM wallet_transactions
     WHERE wallet_id = NEW.wallet_id
       AND (status = 'completed' OR (status = 'pending' AND amount_cents < 0));
    IF available + NEW.amount_cents < 0 THEN
        RAISE EXCEPTION 'wallet overdraft rejected: available % cents, debit % cents',
            available, NEW.amount_cents;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""


def upgrade() -> None:
    op.execute(SETTLEMENT_AWARE_MUTATION_GUARD)
    op.execute(OVERDRAFT_GUARD_FUNCTION)
    op.execute(
        "CREATE TRIGGER wallet_txn_no_overdraft "
        "BEFORE INSERT ON wallet_transactions "
        "FOR EACH ROW EXECUTE FUNCTION enforce_wallet_no_overdraft();"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS wallet_txn_no_overdraft ON wallet_transactions;")
    op.execute("DROP FUNCTION IF EXISTS enforce_wallet_no_overdraft();")
    op.execute(ORIGINAL_MUTATION_GUARD)
