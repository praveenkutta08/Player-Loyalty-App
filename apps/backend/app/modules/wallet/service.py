"""Wallet services: derived balances + idempotent money movement via CashlessPort."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.cashless import CashlessPort
from ...ports.errors import AdapterError, AdapterRejectedError
from ...ports.types import Money
from ..players.models import Player
from .models import Wallet, WalletTransaction, WalletTxnStatus, WalletTxnType


async def get_or_create_wallet(session: AsyncSession, player: Player) -> Wallet:
    wallet = (
        await session.execute(select(Wallet).where(Wallet.player_id == player.id))
    ).scalar_one_or_none()
    if wallet is None:
        wallet = Wallet(tenant_id=player.tenant_id, player_id=player.id)
        session.add(wallet)
        await session.flush()
    return wallet


async def list_transactions(
    session: AsyncSession, player: Player, limit: int = 100
) -> list[WalletTransaction]:
    """Player's ledger, newest first — backs the Wallet history view (S5/S9)."""
    wallet = await get_or_create_wallet(session, player)
    rows = (
        await session.execute(
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
            .limit(limit)
        )
    ).scalars().all()
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


async def _existing(session: AsyncSession, tenant_id: UUID, idem: str) -> WalletTransaction | None:
    return (
        await session.execute(
            select(WalletTransaction).where(
                WalletTransaction.tenant_id == tenant_id,
                WalletTransaction.idempotency_key == idem,
            )
        )
    ).scalar_one_or_none()


async def _record(
    session: AsyncSession,
    wallet: Wallet,
    player: Player,
    txn_type: WalletTxnType,
    amount_cents: int,
    idem: str,
    *,
    egm_id: str | None = None,
    external_ref: str | None = None,
) -> WalletTransaction:
    txn = WalletTransaction(
        tenant_id=player.tenant_id,
        wallet_id=wallet.id,
        player_id=player.id,
        type=txn_type.value,
        amount_cents=amount_cents,
        egm_id=egm_id,
        external_ref=external_ref,
        status=WalletTxnStatus.completed.value,
        idempotency_key=idem,
    )
    session.add(txn)
    await session.flush()
    wallet.balance_cents = await derived_balance(session, wallet.id)
    await session.flush()
    return txn


async def fund(
    session: AsyncSession, cashless: CashlessPort, player: Player, amount_cents: int, idem: str
) -> WalletTransaction:
    wallet = await get_or_create_wallet(session, player)
    existing = await _existing(session, player.tenant_id, idem)
    if existing is not None:
        return existing
    try:
        ext = await cashless.fund(str(player.id), Money(amount_cents, wallet.currency), idem)
    except AdapterRejectedError as exc:
        raise ProblemException(409, "Funding rejected", detail=str(exc)) from exc
    except AdapterError as exc:
        raise ProblemException(503, "Cashless host unavailable", detail=str(exc)) from exc
    return await _record(
        session, wallet, player, WalletTxnType.fund, amount_cents, idem, external_ref=ext.id
    )


async def transfer_to_egm(
    session: AsyncSession,
    cashless: CashlessPort,
    player: Player,
    amount_cents: int,
    egm_id: str,
    idem: str,
) -> WalletTransaction:
    wallet = await get_or_create_wallet(session, player)
    existing = await _existing(session, player.tenant_id, idem)
    if existing is not None:
        return existing
    if await derived_balance(session, wallet.id) < amount_cents:
        raise ProblemException(409, "Insufficient funds")
    try:
        ext = await cashless.transfer(
            str(player.id), egm_id, Money(amount_cents, wallet.currency), idem
        )
    except AdapterRejectedError as exc:
        raise ProblemException(409, "Transfer rejected", detail=str(exc)) from exc
    except AdapterError as exc:
        raise ProblemException(503, "Cashless host unavailable", detail=str(exc)) from exc
    return await _record(
        session,
        wallet,
        player,
        WalletTxnType.transfer_to_egm,
        -amount_cents,
        idem,
        egm_id=egm_id,
        external_ref=ext.id,
    )


async def cashout(
    session: AsyncSession, cashless: CashlessPort, player: Player, amount_cents: int, idem: str
) -> WalletTransaction:
    wallet = await get_or_create_wallet(session, player)
    existing = await _existing(session, player.tenant_id, idem)
    if existing is not None:
        return existing
    if await derived_balance(session, wallet.id) < amount_cents:
        raise ProblemException(409, "Insufficient funds")
    try:
        ext = await cashless.cashout(str(player.id), Money(amount_cents, wallet.currency), idem)
    except AdapterRejectedError as exc:
        raise ProblemException(409, "Cashout rejected", detail=str(exc)) from exc
    except AdapterError as exc:
        raise ProblemException(503, "Cashless host unavailable", detail=str(exc)) from exc
    return await _record(
        session, wallet, player, WalletTxnType.cashout, -amount_cents, idem, external_ref=ext.id
    )
