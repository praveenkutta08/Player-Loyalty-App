"""Digital key services via DigitalKeyPort. Keys are only issued for valid hotel reservations."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.digital_key import DigitalKeyPort, UnlockResult
from ...ports.errors import AdapterError
from ..players.models import Player
from ..reservations.models import Reservation, ReservationStatus, ReservationType
from .models import DigitalKey, DigitalKeyStatus


async def issue_key(
    session: AsyncSession, port: DigitalKeyPort, player: Player, reservation_id: UUID, room: str
) -> DigitalKey:
    reservation = (
        await session.execute(
            select(Reservation).where(
                Reservation.id == reservation_id, Reservation.player_id == player.id
            )
        )
    ).scalar_one_or_none()
    if reservation is None:
        raise ProblemException(404, "Reservation not found")
    if reservation.type != ReservationType.hotel.value:
        raise ProblemException(409, "Digital keys require a hotel reservation")
    if reservation.status != ReservationStatus.confirmed.value:
        raise ProblemException(409, "Reservation is not confirmed")
    now = datetime.now(UTC)
    if reservation.end_at is not None and reservation.end_at < now:
        raise ProblemException(409, "Reservation window has passed")

    port_key = await port.issue_key(str(reservation.id), str(player.id), room)
    key = DigitalKey(
        tenant_id=player.tenant_id,
        player_id=player.id,
        reservation_id=reservation.id,
        room=room,
        provider="mock",
        mobile_key_ref=port_key.id,
        valid_from=reservation.start_at,
        valid_to=reservation.end_at,
        status=DigitalKeyStatus.active.value,
    )
    session.add(key)
    await session.flush()
    return key


async def list_keys(session: AsyncSession, player: Player) -> list[DigitalKey]:
    return list(
        (await session.execute(select(DigitalKey).where(DigitalKey.player_id == player.id)))
        .scalars()
        .all()
    )


async def _get_key(session: AsyncSession, player: Player, key_id: UUID) -> DigitalKey:
    key = (
        await session.execute(
            select(DigitalKey).where(DigitalKey.id == key_id, DigitalKey.player_id == player.id)
        )
    ).scalar_one_or_none()
    if key is None:
        raise ProblemException(404, "Key not found")
    return key


async def unlock(
    session: AsyncSession, port: DigitalKeyPort, player: Player, key_id: UUID, door_id: str
) -> UnlockResult:
    key = await _get_key(session, player, key_id)
    if key.status != DigitalKeyStatus.active.value:
        raise ProblemException(409, f"Key is {key.status}")
    now = datetime.now(UTC)
    if (key.valid_from and now < key.valid_from) or (key.valid_to and now > key.valid_to):
        raise ProblemException(409, "Key is outside its validity window")
    try:
        return await port.unlock(key.mobile_key_ref, door_id)
    except AdapterError as exc:
        raise ProblemException(409, "Unlock failed", detail=str(exc)) from exc


async def revoke(
    session: AsyncSession, port: DigitalKeyPort, player: Player, key_id: UUID
) -> DigitalKey:
    key = await _get_key(session, player, key_id)
    await port.revoke(key.mobile_key_ref)
    key.status = DigitalKeyStatus.revoked.value
    await session.flush()
    return key
