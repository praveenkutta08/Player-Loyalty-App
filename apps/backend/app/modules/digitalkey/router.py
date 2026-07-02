"""Digital key endpoints (player audience) backed by DigitalKeyPort (mock)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_digital_key_port
from ...db.session import get_session
from ...ports.digital_key import DigitalKeyPort
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import DigitalKeyOut, IssueKeyRequest, UnlockRequest, UnlockResponse
from .service import issue_key, list_keys, revoke, unlock

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
KeyPortDep = Annotated[DigitalKeyPort, Depends(get_digital_key_port)]


@router.get("/keys", response_model=list[DigitalKeyOut], tags=["digitalkey"])
async def app_list_keys(player: PlayerDep, session: SessionDep) -> list[DigitalKeyOut]:
    return [DigitalKeyOut.model_validate(k) for k in await list_keys(session, player)]


@router.post("/keys", response_model=DigitalKeyOut, tags=["digitalkey"])
async def app_issue_key(
    body: IssueKeyRequest, player: PlayerDep, session: SessionDep, port: KeyPortDep
) -> DigitalKeyOut:
    key = await issue_key(session, port, player, body.reservation_id, body.room)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="digitalkey:issue",
        entity="digital_key",
        entity_id=key.id,
        meta={"room": body.room},
    )
    return DigitalKeyOut.model_validate(key)


@router.post("/keys/{key_id}/unlock", response_model=UnlockResponse, tags=["digitalkey"])
async def app_unlock(
    key_id: uuid.UUID,
    body: UnlockRequest,
    player: PlayerDep,
    session: SessionDep,
    port: KeyPortDep,
) -> UnlockResponse:
    result = await unlock(session, port, player, key_id, body.door_id)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="digitalkey:unlock",
        entity="digital_key",
        entity_id=key_id,
        meta={"door_id": body.door_id, "unlocked": result.unlocked},
    )
    return UnlockResponse(
        key_id=key_id, door_id=result.door_id, unlocked=result.unlocked, at=result.at
    )


@router.post("/keys/{key_id}/revoke", response_model=DigitalKeyOut, tags=["digitalkey"])
async def app_revoke(
    key_id: uuid.UUID, player: PlayerDep, session: SessionDep, port: KeyPortDep
) -> DigitalKeyOut:
    key = await revoke(session, port, player, key_id)
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="digitalkey:revoke",
        entity="digital_key",
        entity_id=key_id,
    )
    return DigitalKeyOut.model_validate(key)
