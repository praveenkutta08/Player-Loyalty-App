"""Reservations (hotel/dining/nightlife) + valet requests (tenant-owned, RLS)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class ReservationType(enum.StrEnum):
    hotel = "hotel"
    dining = "dining"
    nightlife = "nightlife"


class ReservationStatus(enum.StrEnum):
    requested = "requested"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class ValetStatus(enum.StrEnum):
    requested = "requested"
    ready = "ready"
    delivered = "delivered"
    cancelled = "cancelled"


class Reservation(TenantOwnedMixin, BaseModel):
    __tablename__ = "reservations"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=ReservationStatus.requested.value,
        server_default="requested",
    )
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    external_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class ValetRequest(TenantOwnedMixin, BaseModel):
    __tablename__ = "valet_requests"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    ticket_ref: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ValetStatus.requested.value, server_default="requested"
    )
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
