"""Rewards marketplace endpoints: admin CMS CRUD (content:*) + app list/redeem/history."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_loyalty_port
from ...core.errors import ProblemException
from ...db.session import get_session
from ...ports.loyalty import LoyaltyPort
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import RedemptionOut, RewardItemCreate, RewardItemOut, RewardItemUpdate
from .service import (
    create_item,
    delete_item,
    list_items_admin,
    list_my_redemptions,
    list_published,
    redeem,
    update_item,
)

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
LoyaltyDep = Annotated[LoyaltyPort, Depends(get_loyalty_port)]


async def idempotency_key(
    key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> str:
    if not key:
        raise ProblemException(400, "Idempotency-Key header required")
    return key


IdemDep = Annotated[str, Depends(idempotency_key)]


# ------------------------------------------------------------------ admin (CMS)
@router.get(
    "/rewards/admin",
    response_model=list[RewardItemOut],
    tags=["rewards"],
    dependencies=[Depends(require(Permission.content_read.value))],
)
async def admin_list(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[RewardItemOut]:
    return [RewardItemOut.model_validate(i) for i in await list_items_admin(session, tenant_id)]


@router.post(
    "/rewards/admin",
    response_model=RewardItemOut,
    status_code=status.HTTP_201_CREATED,
    tags=["rewards"],
)
async def admin_create(
    body: RewardItemCreate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_create.value))],
) -> RewardItemOut:
    item = await create_item(session, tenant_id, body)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="reward_item:create",
        entity="reward_item",
        entity_id=item.id,
    )
    return RewardItemOut.model_validate(item)


@router.put(
    "/rewards/admin/{item_id}",
    response_model=RewardItemOut,
    tags=["rewards"],
)
async def admin_update(
    item_id: uuid.UUID,
    body: RewardItemUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_update.value))],
) -> RewardItemOut:
    item = await update_item(session, tenant_id, item_id, body)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="reward_item:update",
        entity="reward_item",
        entity_id=item_id,
    )
    return RewardItemOut.model_validate(item)


@router.delete(
    "/rewards/admin/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["rewards"],
)
async def admin_delete(
    item_id: uuid.UUID,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_delete.value))],
) -> None:
    await delete_item(session, tenant_id, item_id)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="reward_item:delete",
        entity="reward_item",
        entity_id=item_id,
    )


# ------------------------------------------------------------------ app
@router.get("/rewards", response_model=list[RewardItemOut], tags=["rewards"])
async def app_list(player: PlayerDep, session: SessionDep) -> list[RewardItemOut]:
    return [
        RewardItemOut.model_validate(i) for i in await list_published(session, player.tenant_id)
    ]


@router.post("/rewards/{item_id}/redeem", response_model=RedemptionOut, tags=["rewards"])
async def app_redeem(
    item_id: uuid.UUID,
    player: PlayerDep,
    session: SessionDep,
    loyalty: LoyaltyDep,
    idem: IdemDep,
) -> RedemptionOut:
    redemption = await redeem(session, loyalty, player, item_id, idem)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="reward:redeem",
        entity="reward_redemption",
        entity_id=redemption.id,
        meta={"reward_item_id": str(item_id), "points_spent": redemption.points_spent},
    )
    return RedemptionOut.model_validate(redemption)


@router.get("/me/redemptions", response_model=list[RedemptionOut], tags=["rewards"])
async def app_my_redemptions(player: PlayerDep, session: SessionDep) -> list[RedemptionOut]:
    return [RedemptionOut.model_validate(r) for r in await list_my_redemptions(session, player)]
