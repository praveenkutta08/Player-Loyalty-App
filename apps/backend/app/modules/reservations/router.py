"""Reservations & valet: admin management (reservations:*) + player book/request/status."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import (
    ReservationBook,
    ReservationOut,
    ReservationStatusUpdate,
    ValetOut,
    ValetStatusUpdate,
)
from .service import (
    book_reservation,
    get_reservation,
    get_valet,
    list_reservations,
    list_valet,
    request_valet,
    set_reservation_status,
    set_valet_status,
)

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


# ------------------------------------------------------------------ admin
@router.get(
    "/reservations",
    response_model=list[ReservationOut],
    tags=["reservations"],
    dependencies=[Depends(require(Permission.reservations_read.value))],
)
async def admin_list_reservations(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[ReservationOut]:
    return [ReservationOut.model_validate(r) for r in await list_reservations(session, tenant_id)]


@router.patch(
    "/reservations/{res_id}",
    response_model=ReservationOut,
    tags=["reservations"],
    dependencies=[Depends(require(Permission.reservations_update.value))],
)
async def admin_update_reservation(
    res_id: uuid.UUID,
    body: ReservationStatusUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
) -> ReservationOut:
    return ReservationOut.model_validate(
        await set_reservation_status(session, tenant_id, res_id, body.status)
    )


@router.get(
    "/valet",
    response_model=list[ValetOut],
    tags=["reservations"],
    dependencies=[Depends(require(Permission.reservations_read.value))],
)
async def admin_list_valet(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[ValetOut]:
    return [ValetOut.model_validate(v) for v in await list_valet(session, tenant_id)]


@router.patch(
    "/valet/{valet_id}",
    response_model=ValetOut,
    tags=["reservations"],
    dependencies=[Depends(require(Permission.reservations_update.value))],
)
async def admin_update_valet(
    valet_id: uuid.UUID,
    body: ValetStatusUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
) -> ValetOut:
    return ValetOut.model_validate(
        await set_valet_status(session, tenant_id, valet_id, body.status)
    )


# ------------------------------------------------------------------ player
@router.post("/app/reservations", response_model=ReservationOut, tags=["reservations"])
async def app_book(body: ReservationBook, player: PlayerDep, session: SessionDep) -> ReservationOut:
    return ReservationOut.model_validate(await book_reservation(session, player, body))


@router.get("/app/reservations", response_model=list[ReservationOut], tags=["reservations"])
async def app_list_reservations(player: PlayerDep, session: SessionDep) -> list[ReservationOut]:
    items = await list_reservations(session, player.tenant_id, player.id)
    return [ReservationOut.model_validate(r) for r in items]


@router.get("/app/reservations/{res_id}", response_model=ReservationOut, tags=["reservations"])
async def app_get_reservation(
    res_id: uuid.UUID, player: PlayerDep, session: SessionDep
) -> ReservationOut:
    return ReservationOut.model_validate(await get_reservation(session, player.tenant_id, res_id))


@router.post("/app/valet", response_model=ValetOut, tags=["reservations"])
async def app_request_valet(player: PlayerDep, session: SessionDep) -> ValetOut:
    return ValetOut.model_validate(await request_valet(session, player))


@router.get("/app/valet/{valet_id}", response_model=ValetOut, tags=["reservations"])
async def app_get_valet(valet_id: uuid.UUID, player: PlayerDep, session: SessionDep) -> ValetOut:
    return ValetOut.model_validate(await get_valet(session, player.tenant_id, valet_id))
