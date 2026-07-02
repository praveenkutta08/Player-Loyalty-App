"""Wallet + append-only wallet_transactions ledger (GOLDEN RULE #4).

Balances are DERIVED from the immutable ledger (a DB trigger blocks UPDATE/DELETE on
wallet_transactions). ``wallets.balance_cents`` is a convenience cache refreshed on each write.
"""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import BigInteger, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class WalletTxnType(enum.StrEnum):
    fund = "fund"
    transfer_to_egm = "transfer_to_egm"
    cashout = "cashout"
    refund = "refund"


class WalletTxnStatus(enum.StrEnum):
    # pending rows are inserted (and committed) BEFORE the external cashless call; the only
    # mutation the append-only trigger allows is the pending -> completed/failed settlement.
    pending = "pending"
    completed = "completed"
    failed = "failed"


class Wallet(TenantOwnedMixin, BaseModel):
    __tablename__ = "wallets"
    __table_args__ = (
        UniqueConstraint("tenant_id", "player_id", name="uq_wallets_tenant_id_player_id"),
    )

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, default="USD", server_default="USD"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="active", server_default="active"
    )
    # Cached balance; the ledger is the source of truth.
    balance_cents: Mapped[int] = mapped_column(
        BigInteger, nullable=False, default=0, server_default="0"
    )


class WalletTransaction(TenantOwnedMixin, BaseModel):
    __tablename__ = "wallet_transactions"
    __table_args__ = (
        # Player-scoped (audit H1): one player's key can never collide with — or replay —
        # another player's transaction. Cross-player reuse is rejected 409 in the service.
        UniqueConstraint(
            "tenant_id",
            "player_id",
            "idempotency_key",
            name="uq_wallet_txn_tenant_player_idem",
        ),
    )

    wallet_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("wallets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    # Signed minor units: credits positive (fund/refund), debits negative (transfer/cashout).
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    egm_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    external_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=WalletTxnStatus.completed.value,
        server_default="completed",
    )
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
