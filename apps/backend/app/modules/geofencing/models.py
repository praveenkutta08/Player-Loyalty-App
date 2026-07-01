"""Geofencing: zones, beacons, location triggers, and the append-only location_events audit.

All tenant-owned (RLS). See analysis Section 10 for the dwell use case. The client detects
enter/dwell/exit and POSTs events; the server-side trigger engine matches rules and dispatches.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class ZoneType(enum.StrEnum):
    gps = "gps"
    beacon = "beacon"


class TriggerEvent(enum.StrEnum):
    enter = "enter"
    exit = "exit"
    dwell = "dwell"


class GeofenceZone(TenantOwnedMixin, BaseModel):
    __tablename__ = "geofence_zones"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    type: Mapped[str] = mapped_column(
        String(10), nullable=False, default="gps", server_default="gps"
    )
    center_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    center_lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    radius_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    polygon: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )


class Beacon(TenantOwnedMixin, BaseModel):
    __tablename__ = "beacons"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("geofence_zones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    uuid_: Mapped[str] = mapped_column("uuid", String(64), nullable=False)
    major: Mapped[int] = mapped_column(Integer, nullable=False)
    minor: Mapped[int] = mapped_column(Integer, nullable=False)


class LocationTrigger(TenantOwnedMixin, BaseModel):
    __tablename__ = "location_triggers"

    zone_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("geofence_zones.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    event: Mapped[str] = mapped_column(String(10), nullable=False)
    dwell_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    offer_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    segment: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency_cap_per_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quiet_hours_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quiet_hours_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )


class LocationEvent(TenantOwnedMixin, BaseModel):
    """Append-only audit of every processed location event and its outcome."""

    __tablename__ = "location_events"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    zone_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    trigger_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    event: Mapped[str] = mapped_column(String(10), nullable=False)
    dwell_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result: Mapped[str] = mapped_column(String(30), nullable=False)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
