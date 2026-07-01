"""Schemas for notification campaigns."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    body: str
    segment: str | None
    deep_link: dict[str, Any] | None
    schedule_at: datetime | None
    status: str


class NotificationCreate(BaseModel):
    title: str
    body: str
    segment: str | None = None
    deep_link: dict[str, Any] | None = None
    schedule_at: datetime | None = None


class DeliveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    notification_id: UUID
    player_id: UUID
    status: str
    receipt_ref: str | None
    sent_at: datetime


class SendResult(BaseModel):
    notification_id: UUID
    status: str
    delivered: int
    total: int
