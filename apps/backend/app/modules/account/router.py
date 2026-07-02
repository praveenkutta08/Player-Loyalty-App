"""Player account/loyalty endpoints (player audience)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_kyc_port, get_loyalty_port, get_push_port
from ...db.session import get_session
from ...ports.kyc import KycPort
from ...ports.loyalty import LoyaltyPort
from ...ports.push import PushPort
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import ActivityItem, DeviceOut, DeviceRegister, KycOut, MeOut, PointsOut
from .service import get_activity, register_device, start_kyc

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
LoyaltyDep = Annotated[LoyaltyPort, Depends(get_loyalty_port)]
PushDep = Annotated[PushPort, Depends(get_push_port)]
KycDep = Annotated[KycPort, Depends(get_kyc_port)]


@router.get("/me", response_model=MeOut, tags=["account"])
async def me(player: PlayerDep, loyalty: LoyaltyDep) -> MeOut:
    account = await loyalty.get_account(str(player.id))
    return MeOut(
        id=player.id,
        tenant_id=player.tenant_id,
        email=player.email,
        phone=player.phone,
        segment=player.segment,
        status=player.status,
        kyc_status=player.kyc_status,
        points=account.points,
        tier=account.tier,
    )


@router.get("/account/points", response_model=PointsOut, tags=["account"])
async def account_points(player: PlayerDep, loyalty: LoyaltyDep) -> PointsOut:
    account = await loyalty.get_account(str(player.id))
    return PointsOut(points=account.points, tier=account.tier)


@router.get("/account/activity", response_model=list[ActivityItem], tags=["account"])
async def account_activity(player: PlayerDep, loyalty: LoyaltyDep) -> list[ActivityItem]:
    items = await get_activity(loyalty, player)
    return [
        ActivityItem(
            id=a.id,
            type=a.type,
            description=a.description,
            points=a.points,
            amount_cents=a.amount_cents,
            at=a.at,
        )
        for a in items
    ]


@router.post("/me/devices", response_model=DeviceOut, tags=["account"])
async def register_my_device(
    body: DeviceRegister, player: PlayerDep, session: SessionDep, push: PushDep
) -> DeviceOut:
    # audit: exempt — routine device/push-token registration, not privileged/financial.
    device = await register_device(session, push, player, body.platform, body.push_token)
    return DeviceOut.model_validate(device)


@router.post("/account/kyc/start", response_model=KycOut, tags=["account"])
async def start_my_kyc(player: PlayerDep, session: SessionDep, kyc: KycDep) -> KycOut:
    kyc_status = await start_kyc(session, kyc, player)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="kyc:start",
        entity="player",
        entity_id=player.id,
        meta={"kyc_status": kyc_status},
    )
    return KycOut(kyc_status=kyc_status)
