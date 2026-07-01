"""Reservation & valet services with lifecycle transitions.

Booking against an external provider is simulated here (external_ref); a real booking system would
sit behind a port/adapter like the other integrations.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ..players.models import Player
from .models import (
    Reservation,
    ReservationStatus,
    ValetRequest,
    ValetStatus,
)
from .schemas import ReservationBook

_RESERVATION_TERMINAL = {ReservationStatus.cancelled.value, ReservationStatus.completed.value}


async def book_reservation(
    session: AsyncSession, player: Player, data: ReservationBook
) -> Reservation:
    reservation = Reservation(
        tenant_id=player.tenant_id,
        player_id=player.id,
        type=data.type.value,
        status=ReservationStatus.confirmed.value,  # mock provider auto-confirms
        start_at=data.start_at,
        end_at=data.end_at,
        notes=data.notes,
        external_ref=f"BKG-{uuid.uuid4().hex[:10].upper()}",
    )
    session.add(reservation)
    await session.flush()
    return reservation


async def list_reservations(
    session: AsyncSession, tenant_id: UUID, player_id: UUID | None = None
) -> list[Reservation]:
    query = select(Reservation).where(Reservation.tenant_id == tenant_id)
    if player_id is not None:
        query = query.where(Reservation.player_id == player_id)
    return list(
        (await session.execute(query.order_by(Reservation.created_at.desc()))).scalars().all()
    )


async def get_reservation(session: AsyncSession, tenant_id: UUID, res_id: UUID) -> Reservation:
    res = (
        await session.execute(
            select(Reservation).where(Reservation.id == res_id, Reservation.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if res is None:
        raise ProblemException(404, "Reservation not found")
    return res


async def set_reservation_status(
    session: AsyncSession, tenant_id: UUID, res_id: UUID, status: ReservationStatus
) -> Reservation:
    res = await get_reservation(session, tenant_id, res_id)
    if res.status in _RESERVATION_TERMINAL:
        raise ProblemException(409, f"Reservation is already {res.status}")
    res.status = status.value
    await session.flush()
    return res


async def request_valet(session: AsyncSession, player: Player) -> ValetRequest:
    valet = ValetRequest(
        tenant_id=player.tenant_id,
        player_id=player.id,
        ticket_ref=f"VLT-{uuid.uuid4().hex[:8].upper()}",
        status=ValetStatus.requested.value,
        requested_at=datetime.now(UTC),
    )
    session.add(valet)
    await session.flush()
    return valet


async def list_valet(
    session: AsyncSession, tenant_id: UUID, player_id: UUID | None = None
) -> list[ValetRequest]:
    query = select(ValetRequest).where(ValetRequest.tenant_id == tenant_id)
    if player_id is not None:
        query = query.where(ValetRequest.player_id == player_id)
    return list(
        (await session.execute(query.order_by(ValetRequest.requested_at.desc()))).scalars().all()
    )


async def get_valet(session: AsyncSession, tenant_id: UUID, valet_id: UUID) -> ValetRequest:
    valet = (
        await session.execute(
            select(ValetRequest).where(
                ValetRequest.id == valet_id, ValetRequest.tenant_id == tenant_id
            )
        )
    ).scalar_one_or_none()
    if valet is None:
        raise ProblemException(404, "Valet request not found")
    return valet


async def set_valet_status(
    session: AsyncSession, tenant_id: UUID, valet_id: UUID, status: ValetStatus
) -> ValetRequest:
    valet = await get_valet(session, tenant_id, valet_id)
    if valet.status in {ValetStatus.delivered.value, ValetStatus.cancelled.value}:
        raise ProblemException(409, f"Valet request is already {valet.status}")
    valet.status = status.value
    if status is ValetStatus.ready:
        valet.ready_at = datetime.now(UTC)
    await session.flush()
    return valet
