"""Wallet endpoints (player audience). All money moves require an Idempotency-Key."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_cashless_port
from ...core.errors import ProblemException
from ...db.session import get_session
from ...ports.cashless import CashlessPort
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import (
    CashoutRequest,
    EgmPairOut,
    EgmPairRequest,
    FundRequest,
    ReconcileResult,
    TransactionOut,
    TransferRequest,
    WalletOut,
    WalletTransactionOut,
    WalletTransactionPage,
)
from .service import (
    cashout,
    derived_balance,
    fund,
    get_or_create_wallet,
    list_transactions,
    reconcile_wallets,
    transfer_to_egm,
)

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
CashlessDep = Annotated[CashlessPort, Depends(get_cashless_port)]


async def idempotency_key(
    key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> str:
    if not key:
        raise ProblemException(400, "Idempotency-Key header required")
    return key


IdemDep = Annotated[str, Depends(idempotency_key)]


@router.get("/wallet", response_model=WalletOut, tags=["wallet"])
async def get_wallet(player: PlayerDep, session: SessionDep) -> WalletOut:
    wallet = await get_or_create_wallet(session, player)
    wallet.balance_cents = await derived_balance(session, wallet.id)
    return WalletOut.model_validate(wallet)


@router.get("/wallet/transactions", response_model=WalletTransactionPage, tags=["wallet"])
async def wallet_transactions(
    player: PlayerDep,
    session: SessionDep,
    cursor: str | None = None,
    limit: int | None = None,
) -> WalletTransactionPage:
    """The player's append-only ledger, newest first (history view). Cursor-paginated (M2)."""
    page = await list_transactions(session, player, cursor=cursor, limit=limit)
    return WalletTransactionPage(
        items=[WalletTransactionOut.model_validate(txn) for txn in page.items],
        next_cursor=page.next_cursor,
        has_more=page.has_more,
    )


@router.post("/wallet/fund", response_model=TransactionOut, tags=["wallet"])
async def wallet_fund(
    body: FundRequest, player: PlayerDep, session: SessionDep, cashless: CashlessDep, idem: IdemDep
) -> TransactionOut:
    txn = await fund(session, cashless, player, body.amount_cents, idem)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="wallet:fund",
        entity="wallet_transaction",
        entity_id=txn.id,
        meta={"amount_cents": body.amount_cents},
    )
    return TransactionOut.model_validate(txn)


@router.post("/wallet/transfer", response_model=TransactionOut, tags=["wallet"])
async def wallet_transfer(
    body: TransferRequest,
    player: PlayerDep,
    session: SessionDep,
    cashless: CashlessDep,
    idem: IdemDep,
) -> TransactionOut:
    txn = await transfer_to_egm(session, cashless, player, body.amount_cents, body.egm_id, idem)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="wallet:transfer_to_egm",
        entity="wallet_transaction",
        entity_id=txn.id,
        meta={"amount_cents": body.amount_cents, "egm_id": body.egm_id},
    )
    return TransactionOut.model_validate(txn)


@router.post("/wallet/cashout", response_model=TransactionOut, tags=["wallet"])
async def wallet_cashout(
    body: CashoutRequest,
    player: PlayerDep,
    session: SessionDep,
    cashless: CashlessDep,
    idem: IdemDep,
) -> TransactionOut:
    txn = await cashout(session, cashless, player, body.amount_cents, idem)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="wallet:cashout",
        entity="wallet_transaction",
        entity_id=txn.id,
        meta={"amount_cents": body.amount_cents},
    )
    return TransactionOut.model_validate(txn)


@router.post(
    "/wallet/admin/reconcile",
    response_model=ReconcileResult,
    tags=["wallet"],
)
async def reconcile(
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.wallet_read.value))],
) -> ReconcileResult:
    """Recompute cached wallet balances from the ledger and correct drift for the tenant (LOW).

    Idempotent + self-healing (only moves the cache toward the derived truth); intended to be
    called on a schedule by a cron/worker. Records an audit row with the correction count.
    """
    result = await reconcile_wallets(session)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="wallet:reconcile",
        entity="wallet",
        entity_id=None,
        meta=result,
    )
    return ReconcileResult(**result)


@router.post("/egm/pair", response_model=EgmPairOut, tags=["wallet"])
async def egm_pair(body: EgmPairRequest, player: PlayerDep) -> EgmPairOut:
    """Return a simulated cardless-play pairing session for an EGM (mock-only)."""
    # audit: exempt — mock-only pairing simulation, no persistence and no money movement. When a
    # real cardless adapter lands this must persist a pairing session + audit the issue.
    return EgmPairOut(
        session_id=uuid.uuid4(),
        egm_id=body.egm_id,
        status="paired",
        paired_at=datetime.now(UTC),
    )
