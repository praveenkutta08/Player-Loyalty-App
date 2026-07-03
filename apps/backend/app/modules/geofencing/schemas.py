"""Schemas for geofencing zones, beacons, triggers, sync, and events."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import TriggerEvent, ZoneType


class ZoneOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    type: str
    center_lat: float | None
    center_lng: float | None
    radius_m: int | None
    polygon: list[Any] | None
    is_active: bool


class ZonePage(BaseModel):
    """Cursor-paginated admin geofence-zone list (M2)."""

    items: list[ZoneOut]
    next_cursor: str | None = None
    has_more: bool = False


class ZoneCreate(BaseModel):
    name: str
    type: ZoneType = ZoneType.gps
    center_lat: float | None = None
    center_lng: float | None = None
    radius_m: int | None = None
    polygon: list[Any] | None = None
    is_active: bool = True


class ZoneUpdate(BaseModel):
    name: str | None = None
    center_lat: float | None = None
    center_lng: float | None = None
    radius_m: int | None = None
    polygon: list[Any] | None = None
    is_active: bool | None = None


class BeaconOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    zone_id: UUID
    uuid_: str
    major: int
    minor: int


class BeaconCreate(BaseModel):
    zone_id: UUID
    uuid_: str
    major: int
    minor: int


class TriggerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    zone_id: UUID
    name: str
    event: str
    dwell_seconds: int | None
    offer_id: UUID | None
    segment: str | None
    frequency_cap_per_day: int | None
    quiet_hours_start: int | None
    quiet_hours_end: int | None
    is_active: bool


class TriggerCreate(BaseModel):
    zone_id: UUID
    name: str
    event: TriggerEvent
    dwell_seconds: int | None = None
    offer_id: UUID | None = None
    segment: str | None = None
    frequency_cap_per_day: int | None = None
    quiet_hours_start: int | None = None
    quiet_hours_end: int | None = None
    is_active: bool = True


class TriggerUpdate(BaseModel):
    name: str | None = None
    dwell_seconds: int | None = None
    offer_id: UUID | None = None
    segment: str | None = None
    frequency_cap_per_day: int | None = None
    quiet_hours_start: int | None = None
    quiet_hours_end: int | None = None
    is_active: bool | None = None


class GeoSyncOut(BaseModel):
    zones: list[ZoneOut]
    beacons: list[BeaconOut]


class GeoEventIn(BaseModel):
    zone_id: UUID
    event: TriggerEvent
    dwell_seconds: int | None = None


class TriggerResult(BaseModel):
    trigger_id: UUID
    result: str
    notification_id: UUID | None = None


class GeoEventOut(BaseModel):
    results: list[TriggerResult]


class ConsentIn(BaseModel):
    granted: bool


class ConsentOut(BaseModel):
    location_consent: bool
