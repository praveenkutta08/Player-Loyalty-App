"""Wallet services: derived balances + idempotent money movement via CashlessPort.

Concurrency & crash-safety (audit C2)
-------------------------------------
- Every money flow takes a ``SELECT ... FOR UPDATE`` lock on the wallet row, serializing
  writers per wallet (idempotency check, balance guard and pending insert happen under it).
- The ledger row is inserted in ``pending`` state and COMMITTED before the cashless adapter is
  called, so a crash mid-call leaves a visible pending row (idempotent recovery) and a replay
  of the same key can never trigger a second external side effect. No DB lock is held while
  awaiting the external host.
- Settlement is the only UPDATE the append-only trigger permits: ``pending -> completed|failed``
  with all money fields frozen (see migration ``c3f8b2a1d905``). A ``failed`` row is terminal
  for its idempotency key — clients retry with a NEW key.
- The *available* balance counts completed rows plus pending debits (in-flight money-out acts
  as a hold), and a DB trigger (``wallet_txn_no_overdraft``) re-checks the same rule on insert
  so the ledger cannot go negative even if an app path skips the lock.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.cashless import CashlessPort, CashlessTransaction
from ...ports.errors import AdapterError, AdapterRejectedError
from ...ports.types import Money
from ...tenancy.deps import set_tenant_context
from ..players.models import Player
from .models import Wallet, WalletTransaction, WalletTxnStatus, WalletTxnType


async def get_or_create_wallet(
    session: AsyncSession, player: Player, *, for_update: bool = False
) -> Wallet:
    """Fetch (optionally locking) the player's wallet, creating it on first use.

    Money flows pass ``for_update=True`` so per-wallet operations serialize; the create path
    tolerates a concurrent first-use race via the unique constraint + re-select.
    """
    stmt = select(Wallet).where(Wallet.player_id == player.id)
    if for_update:
        stmt = stmt.with_for_update()
    wallet = (await session.execute(stmt)).scalar_one_or_none()
    if wallet is None:
        try:
            async with session.begin_nested():
                wallet = Wallet(tenant_id=player.tenant_id, player_id=player.id)
                session.add(wallet)
                await session.flush()
        except IntegrityError:
            # A concurrent request created it first — re-select (re-locking if requested).
            wallet = (await session.execute(stmt)).scalar_one()
    return wallet


async def list_transactions(
    session: AsyncSession, player: Player, limit: int = 100
) -> list[WalletTransaction]:
    """Player's ledger, newest first — backs the Wallet history view (S5/S9)."""
    wallet = await get_or_create_wallet(session, player)
    rows = (
        (
            await session.execute(
                select(WalletTransaction)
                .where(WalletTransaction.wallet_id == wallet.id)
                .order_by(WalletTransaction.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


async def derived_balance(session: AsyncSession, wallet_id: UUID) -> int:
    """Authoritative balance = sum of completed ledger entries."""
    total = (
        await session.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount_cents), 0)).where(
                WalletTransaction.wallet_id == wallet_id,
                WalletTransaction.status == WalletTxnStatus.completed.value,
            )
        )
    ).scalar_one()
    return int(total)


async def available_balance(session: AsyncSession, wallet_id: UUID) -> int:
    """Spendable balance: completed entries plus pending debits (holds on in-flight money-out).

    Pending credits do NOT count — unsettled funding cannot be spent.
    """
    total = (
        await session.execute(
            select(func.coalesce(func.sum(WalletTransaction.amount_cents), 0)).where(
                WalletTransaction.wallet_id == wallet_id,
                or_(
                    WalletTransaction.status == WalletTxnStatus.completed.value,
                    and_(
                        WalletTransaction.status == WalletTxnStatus.pending.value,
                        WalletTransaction.amount_cents < 0,
                    ),
                ),
            )
        )
    ).scalar_one()
    return int(total)


async def _existing(
    session: AsyncSession, tenant_id: UUID, player_id: UUID, idem: str
) -> WalletTransaction | None:
    """Idempotent-replay lookup scoped to the acting player (audit H1).

    A key already used by a DIFFERENT player in the tenant is a 409 conflict — another
    player's transaction is never returned.
    """
    rows = (
        (
            await session.execute(
                select(WalletTransaction).where(
                    WalletTransaction.tenant_id == tenant_id,
                    WalletTransaction.idempotency_key == idem,
                )
            )
        )
        .scalars()
        .all()
    )
    own = next((t for t in rows if t.player_id == player_id), None)
    if own is not None:
        return own
    if rows:
        raise ProblemException(
            409,
            "Idempotency key conflict",
            detail="This Idempotency-Key was already used by another actor.",
        )
    return None


async def _settle(
    session: AsyncSession,
    player: Player,
    txn_id: UUID,
    status: WalletTxnStatus,
    *,
    external_ref: str | None = None,
) -> WalletTransaction:
    """Transition a pending row to completed/failed and refresh the cached wallet balance.

    Re-acquires the wallet lock (the pending-commit released it) so settlement serializes with
    other money flows on the same wallet.
    """
    wallet = (
        await session.execute(
            select(Wallet).where(Wallet.player_id == player.id).with_for_update()
        )
    ).scalar_one()
    txn = (
        await session.execute(
            select(WalletTransaction).where(WalletTransaction.id == txn_id)
        )
    ).scalar_one()
    txn.status = status.value
    if external_ref is not None:
        txn.external_ref = external_ref
    await session.flush()
    wallet.balance_cents = await derived_balance(session, wallet.id)
    await session.flush()
    return txn


async def _execute_money_flow(
    session: AsyncSession,
    player: Player,
    *,
    txn_type: WalletTxnType,
    signed_amount: int,
    idem: str,
    adapter_call: Callable[[Wallet], Awaitable[CashlessTransaction]],
    rejected_title: str,
    egm_id: str | None = None,
) -> WalletTransaction:
    """Shared lock -> replay-check -> pending -> adapter -> settle skeleton for all money moves."""
    wallet = await get_or_create_wallet(session, player, for_update=True)

    existing = await _existing(session, player.tenant_id, player.id, idem)
    if existing is not None:
        return existing  # idempotent replay — pending/completed/failed returned as-is

    if signed_amount < 0 and await available_balance(session, wallet.id) < -signed_amount:
        raise ProblemException(409, "Insufficient funds")

    txn = WalletTransaction(
        tenant_id=player.tenant_id,
        wallet_id=wallet.id,
        player_id=player.id,
        type=txn_type.value,
        amount_cents=signed_amount,
        egm_id=egm_id,
        status=WalletTxnStatus.pending.value,
        idempotency_key=idem,
    )
    try:
        async with session.begin_nested():
            session.add(txn)
            await session.flush()
    except IntegrityError:
        # A concurrent same-key request won the insert (only reachable when the writer didn't
        # hold this wallet's lock) — return the winner instead of 500ing.
        winner = await _existing(session, player.tenant_id, player.id, idem)
        if winner is not None:
            return winner
        raise
    txn_id = txn.id

    # Make the pending row durable BEFORE the external call (crash recovery / no double side
    # effects). The commit ends the transaction, clearing SET LOCAL role + tenant GUC and
    # releasing the wallet lock — re-establish context for the statements that follow.
    await session.commit()
    await set_tenant_context(session, player.tenant_id)

    try:
        ext = await adapter_call(wallet)
    except AdapterRejectedError as exc:
        await _settle(session, player, txn_id, WalletTxnStatus.failed)
        await session.commit()  # the 409 below triggers a request rollback — persist first
        raise ProblemException(409, rejected_title, detail=str(exc)) from exc
    except AdapterError as exc:
        await _settle(session, player, txn_id, WalletTxnStatus.failed)
        await session.commit()
        raise ProblemException(503, "Cashless host unavailable", detail=str(exc)) from exc

    return await _settle(
        session, player, txn_id, WalletTxnStatus.completed, external_ref=ext.id
    )


async def fund(
    session: AsyncSession, cashless: CashlessPort, player: Player, amount_cents: int, idem: str
) -> WalletTransaction:
    return await _execute_money_flow(
        session,
        player,
        txn_type=WalletTxnType.fund,
        signed_amount=amount_cents,
        idem=idem,
        adapter_call=lambda wallet: cashless.fund(
            str(player.id), Money(amount_cents, wallet.currency), idem
        ),
        rejected_title="Funding rejected",
    )


async def transfer_to_egm(
    session: AsyncSession,
    cashless: CashlessPort,
    player: Player,
    amount_cents: int,
    egm_id: str,
    idem: str,
) -> WalletTransaction:
    return await _execute_money_flow(
        session,
        player,
        txn_type=WalletTxnType.transfer_to_egm,
        signed_amount=-amount_cents,
        idem=idem,
        adapter_call=lambda wallet: cashless.transfer(
            str(player.id), egm_id, Money(amount_cents, wallet.currency), idem
        ),
        rejected_title="Transfer rejected",
        egm_id=egm_id,
    )


async def cashout(
    session: AsyncSession, cashless: CashlessPort, player: Player, amount_cents: int, idem: str
) -> WalletTransaction:
    return await _execute_money_flow(
        session,
        player,
        txn_type=WalletTxnType.cashout,
        signed_amount=-amount_cents,
        idem=idem,
        adapter_call=lambda wallet: cashless.cashout(
            str(player.id), Money(amount_cents, wallet.currency), idem
        ),
        rejected_title="Cashout rejected",
    )
