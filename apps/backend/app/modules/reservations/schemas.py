"""Schemas for reservations & valet."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import ReservationStatus, ReservationType, ValetStatus


class ReservationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    player_id: UUID
    type: str
    status: str
    start_at: datetime | None
    end_at: datetime | None
    external_ref: str | None
    notes: str | None


class ReservationBook(BaseModel):
    type: ReservationType
    start_at: datetime | None = None
    end_at: datetime | None = None
    notes: str | None = None


class ReservationStatusUpdate(BaseModel):
    status: ReservationStatus


class ValetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    player_id: UUID
    ticket_ref: str
    status: str
    requested_at: datetime
    ready_at: datetime | None


class ValetStatusUpdate(BaseModel):
    status: ValetStatus
