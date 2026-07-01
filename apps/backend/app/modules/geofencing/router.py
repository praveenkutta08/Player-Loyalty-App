"""Geofencing endpoints: admin zone/beacon/trigger CRUD + player sync/events/consent."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_push_port
from ...db.session import get_session
from ...ports.push import PushPort
from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import (
    BeaconCreate,
    BeaconOut,
    ConsentIn,
    ConsentOut,
    GeoEventIn,
    GeoEventOut,
    GeoSyncOut,
    TriggerCreate,
    TriggerOut,
    TriggerUpdate,
    ZoneCreate,
    ZoneOut,
    ZoneUpdate,
)
from .service import (
    create_beacon,
    create_trigger,
    create_zone,
    delete_trigger,
    delete_zone,
    list_beacons,
    list_triggers,
    list_zones,
    process_event,
    set_consent,
    sync,
    update_trigger,
    update_zone,
)

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
PushDep = Annotated[PushPort, Depends(get_push_port)]

_ZONES = "geofence_zones"
_TRIGGERS = "location_triggers"


# ------------------------------------------------------------------ admin: zones
@router.get(
    "/geo/zones",
    response_model=list[ZoneOut],
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.geofence_zones_read.value))],
)
async def list_geo_zones(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[ZoneOut]:
    return [ZoneOut.model_validate(z) for z in await list_zones(session, tenant_id)]


@router.post(
    "/geo/zones",
    response_model=ZoneOut,
    status_code=status.HTTP_201_CREATED,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.geofence_zones_create.value))],
)
async def create_geo_zone(
    body: ZoneCreate, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> ZoneOut:
    return ZoneOut.model_validate(await create_zone(session, tenant_id, body))


@router.put(
    "/geo/zones/{zone_id}",
    response_model=ZoneOut,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.geofence_zones_update.value))],
)
async def update_geo_zone(
    zone_id: uuid.UUID,
    body: ZoneUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
) -> ZoneOut:
    return ZoneOut.model_validate(await update_zone(session, tenant_id, zone_id, body))


@router.delete(
    "/geo/zones/{zone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.geofence_zones_delete.value))],
)
async def delete_geo_zone(
    zone_id: uuid.UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> None:
    await delete_zone(session, tenant_id, zone_id)


@router.post(
    "/geo/beacons",
    response_model=BeaconOut,
    status_code=status.HTTP_201_CREATED,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.geofence_zones_create.value))],
)
async def create_geo_beacon(
    body: BeaconCreate, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> BeaconOut:
    return BeaconOut.model_validate(await create_beacon(session, tenant_id, body))


# ------------------------------------------------------------------ admin: triggers
@router.get(
    "/geo/triggers",
    response_model=list[TriggerOut],
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.location_triggers_read.value))],
)
async def list_geo_triggers(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[TriggerOut]:
    return [TriggerOut.model_validate(t) for t in await list_triggers(session, tenant_id)]


@router.post(
    "/geo/triggers",
    response_model=TriggerOut,
    status_code=status.HTTP_201_CREATED,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.location_triggers_create.value))],
)
async def create_geo_trigger(
    body: TriggerCreate, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> TriggerOut:
    return TriggerOut.model_validate(await create_trigger(session, tenant_id, body))


@router.put(
    "/geo/triggers/{trigger_id}",
    response_model=TriggerOut,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.location_triggers_update.value))],
)
async def update_geo_trigger(
    trigger_id: uuid.UUID,
    body: TriggerUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
) -> TriggerOut:
    return TriggerOut.model_validate(await update_trigger(session, tenant_id, trigger_id, body))


@router.delete(
    "/geo/triggers/{trigger_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["geofencing"],
    dependencies=[Depends(require(Permission.location_triggers_delete.value))],
)
async def delete_geo_trigger(
    trigger_id: uuid.UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> None:
    await delete_trigger(session, tenant_id, trigger_id)


# ------------------------------------------------------------------ player
@router.get("/geo/sync", response_model=GeoSyncOut, tags=["geofencing"])
async def geo_sync(player: PlayerDep, session: SessionDep) -> GeoSyncOut:
    zones, beacons = await sync(session, player.tenant_id)
    return GeoSyncOut(
        zones=[ZoneOut.model_validate(z) for z in zones],
        beacons=[BeaconOut.model_validate(b) for b in beacons],
    )


@router.post("/geo/consent", response_model=ConsentOut, tags=["geofencing"])
async def geo_consent(body: ConsentIn, player: PlayerDep, session: SessionDep) -> ConsentOut:
    updated = await set_consent(session, player, body.granted)
    return ConsentOut(location_consent=updated.location_consent)


@router.post("/geo/events", response_model=GeoEventOut, tags=["geofencing"])
async def geo_events(
    body: GeoEventIn, player: PlayerDep, session: SessionDep, push: PushDep
) -> GeoEventOut:
    results = await process_event(
        session, push, player, body.zone_id, body.event, body.dwell_seconds
    )
    return GeoEventOut(results=results)


@router.get("/app/beacons", response_model=list[BeaconOut], tags=["geofencing"])
async def app_list_beacons(player: PlayerDep, session: SessionDep) -> list[BeaconOut]:
    return [BeaconOut.model_validate(b) for b in await list_beacons(session, player.tenant_id)]
