"""Geofencing CRUD + the location trigger engine.

The engine (``process_event``) matches active rules for a zone/event, enforces dwell threshold,
segment, consent, quiet hours and frequency cap, then dispatches the offer via the notifications
module and logs every outcome to the append-only location_events audit.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.push import PushPort
from ..notifications.schemas import NotificationCreate
from ..notifications.service import create_notification
from ..notifications.service import send as send_notification
from ..offers.models import Offer
from ..players.models import Player
from .models import Beacon, GeofenceZone, LocationEvent, LocationTrigger, TriggerEvent
from .schemas import (
    BeaconCreate,
    TriggerCreate,
    TriggerResult,
    TriggerUpdate,
    ZoneCreate,
    ZoneUpdate,
)

MAX_SYNC_ZONES = 20  # respect client region-monitoring limits (e.g. iOS ~20)


# ------------------------------------------------------------------ zones
async def create_zone(session: AsyncSession, tenant_id: UUID, data: ZoneCreate) -> GeofenceZone:
    zone = GeofenceZone(tenant_id=tenant_id, **data.model_dump())
    session.add(zone)
    await session.flush()
    return zone


async def list_zones(session: AsyncSession, tenant_id: UUID) -> list[GeofenceZone]:
    return list(
        (await session.execute(select(GeofenceZone).where(GeofenceZone.tenant_id == tenant_id)))
        .scalars()
        .all()
    )


async def get_zone(session: AsyncSession, tenant_id: UUID, zone_id: UUID) -> GeofenceZone:
    zone = (
        await session.execute(
            select(GeofenceZone).where(
                GeofenceZone.id == zone_id, GeofenceZone.tenant_id == tenant_id
            )
        )
    ).scalar_one_or_none()
    if zone is None:
        raise ProblemException(404, "Zone not found")
    return zone


async def update_zone(
    session: AsyncSession, tenant_id: UUID, zone_id: UUID, data: ZoneUpdate
) -> GeofenceZone:
    zone = await get_zone(session, tenant_id, zone_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(zone, key, value)
    await session.flush()
    return zone


async def delete_zone(session: AsyncSession, tenant_id: UUID, zone_id: UUID) -> None:
    zone = await get_zone(session, tenant_id, zone_id)
    await session.delete(zone)


async def create_beacon(session: AsyncSession, tenant_id: UUID, data: BeaconCreate) -> Beacon:
    await get_zone(session, tenant_id, data.zone_id)  # ensure zone belongs to tenant
    beacon = Beacon(
        tenant_id=tenant_id,
        zone_id=data.zone_id,
        uuid_=data.uuid_,
        major=data.major,
        minor=data.minor,
    )
    session.add(beacon)
    await session.flush()
    return beacon


async def list_beacons(session: AsyncSession, tenant_id: UUID) -> list[Beacon]:
    return list(
        (await session.execute(select(Beacon).where(Beacon.tenant_id == tenant_id))).scalars().all()
    )


# ------------------------------------------------------------------ triggers
async def create_trigger(
    session: AsyncSession, tenant_id: UUID, data: TriggerCreate
) -> LocationTrigger:
    await get_zone(session, tenant_id, data.zone_id)
    trigger = LocationTrigger(tenant_id=tenant_id, **data.model_dump())
    session.add(trigger)
    await session.flush()
    return trigger


async def list_triggers(session: AsyncSession, tenant_id: UUID) -> list[LocationTrigger]:
    return list(
        (
            await session.execute(
                select(LocationTrigger).where(LocationTrigger.tenant_id == tenant_id)
            )
        )
        .scalars()
        .all()
    )


async def get_trigger(session: AsyncSession, tenant_id: UUID, trigger_id: UUID) -> LocationTrigger:
    trigger = (
        await session.execute(
            select(LocationTrigger).where(
                LocationTrigger.id == trigger_id, LocationTrigger.tenant_id == tenant_id
            )
        )
    ).scalar_one_or_none()
    if trigger is None:
        raise ProblemException(404, "Trigger not found")
    return trigger


async def update_trigger(
    session: AsyncSession, tenant_id: UUID, trigger_id: UUID, data: TriggerUpdate
) -> LocationTrigger:
    trigger = await get_trigger(session, tenant_id, trigger_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(trigger, key, value)
    await session.flush()
    return trigger


async def delete_trigger(session: AsyncSession, tenant_id: UUID, trigger_id: UUID) -> None:
    trigger = await get_trigger(session, tenant_id, trigger_id)
    await session.delete(trigger)


# ------------------------------------------------------------------ sync
async def sync(session: AsyncSession, tenant_id: UUID) -> tuple[list[GeofenceZone], list[Beacon]]:
    """Active zones (capped to the client limit) + their beacons.

    A production sync would sort by distance to the player and return the nearest N; here we cap
    to MAX_SYNC_ZONES to respect OS region-monitoring limits.
    """
    zones = list(
        (
            await session.execute(
                select(GeofenceZone)
                .where(GeofenceZone.tenant_id == tenant_id, GeofenceZone.is_active.is_(True))
                .order_by(GeofenceZone.created_at.desc())
                .limit(MAX_SYNC_ZONES)
            )
        )
        .scalars()
        .all()
    )
    beacons = await list_beacons(session, tenant_id)
    return zones, beacons


# ------------------------------------------------------------------ trigger engine
def _in_quiet_hours(now: datetime, start: int | None, end: int | None) -> bool:
    if start is None or end is None or start == end:
        return False
    hour = now.hour
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end  # overnight window


async def _dispatched_today(
    session: AsyncSession, player_id: UUID, trigger_id: UUID, now: datetime
) -> int:
    since = now - timedelta(days=1)
    return int(
        (
            await session.execute(
                select(func.count()).where(
                    LocationEvent.player_id == player_id,
                    LocationEvent.trigger_id == trigger_id,
                    LocationEvent.result == "dispatched",
                    LocationEvent.ts >= since,
                )
            )
        ).scalar_one()
    )


async def _log(
    session: AsyncSession,
    player: Player,
    zone_id: UUID,
    trigger_id: UUID | None,
    event: str,
    dwell_seconds: int | None,
    result: str,
    ts: datetime,
) -> None:
    session.add(
        LocationEvent(
            tenant_id=player.tenant_id,
            player_id=player.id,
            zone_id=zone_id,
            trigger_id=trigger_id,
            event=event,
            dwell_seconds=dwell_seconds,
            result=result,
            ts=ts,
        )
    )
    await session.flush()


async def process_event(
    session: AsyncSession,
    push: PushPort,
    player: Player,
    zone_id: UUID,
    event: TriggerEvent,
    dwell_seconds: int | None,
) -> list[TriggerResult]:
    now = datetime.now(UTC)
    triggers = list(
        (
            await session.execute(
                select(LocationTrigger).where(
                    LocationTrigger.tenant_id == player.tenant_id,
                    LocationTrigger.zone_id == zone_id,
                    LocationTrigger.event == event.value,
                    LocationTrigger.is_active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )

    if not triggers:
        await _log(session, player, zone_id, None, event.value, dwell_seconds, "no_match", now)
        return [TriggerResult(trigger_id=zone_id, result="no_match")]

    results: list[TriggerResult] = []
    for trigger in triggers:
        result, notification_id = await _evaluate(
            session, push, player, trigger, event, dwell_seconds, now
        )
        await _log(session, player, zone_id, trigger.id, event.value, dwell_seconds, result, now)
        results.append(
            TriggerResult(trigger_id=trigger.id, result=result, notification_id=notification_id)
        )
    return results


async def _evaluate(
    session: AsyncSession,
    push: PushPort,
    player: Player,
    trigger: LocationTrigger,
    event: TriggerEvent,
    dwell_seconds: int | None,
    now: datetime,
) -> tuple[str, UUID | None]:
    if event is TriggerEvent.dwell:
        if (
            trigger.dwell_seconds is None
            or dwell_seconds is None
            or dwell_seconds < trigger.dwell_seconds
        ):
            return "dwell_not_met", None

    if trigger.segment and trigger.segment != "all" and player.segment != trigger.segment:
        return "segment_mismatch", None

    if not player.location_consent:
        return "no_consent", None

    if _in_quiet_hours(now, trigger.quiet_hours_start, trigger.quiet_hours_end):
        return "quiet_hours", None

    if trigger.frequency_cap_per_day is not None:
        if (
            await _dispatched_today(session, player.id, trigger.id, now)
            >= trigger.frequency_cap_per_day
        ):
            return "frequency_capped", None

    if trigger.offer_id is None:
        return "no_offer", None

    offer = (
        await session.execute(
            select(Offer).where(Offer.id == trigger.offer_id, Offer.tenant_id == player.tenant_id)
        )
    ).scalar_one_or_none()
    if offer is None:
        return "no_offer", None

    notification = await create_notification(
        session,
        player.tenant_id,
        NotificationCreate(
            title=offer.title,
            body=offer.description or "A special offer is waiting for you.",
            deep_link={"type": "offer", "id": str(offer.id)},
        ),
    )
    await send_notification(session, push, notification, target_player_ids=[player.id])
    return "dispatched", notification.id


async def set_consent(session: AsyncSession, player: Player, granted: bool) -> Player:
    player.location_consent = granted
    await session.flush()
    return player
