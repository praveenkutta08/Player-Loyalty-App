"""Schemas for the player account/loyalty module."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    email: str
    phone: str | None
    segment: str | None
    status: str
    kyc_status: str
    points: int
    tier: str


class PointsOut(BaseModel):
    points: int
    tier: str


class ActivityItem(BaseModel):
    id: str
    type: str
    description: str
    points: int
    amount_cents: int
    at: datetime


class DeviceRegister(BaseModel):
    platform: str
    push_token: str


class DeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    platform: str
    push_token: str


class KycOut(BaseModel):
    kyc_status: str
