"""Schemas for digital keys."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DigitalKeyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    player_id: UUID
    reservation_id: UUID
    room: str
    provider: str
    valid_from: datetime | None
    valid_to: datetime | None
    status: str


class IssueKeyRequest(BaseModel):
    reservation_id: UUID
    room: str


class UnlockRequest(BaseModel):
    door_id: str


class UnlockResponse(BaseModel):
    key_id: UUID
    door_id: str
    unlocked: bool
    at: datetime
