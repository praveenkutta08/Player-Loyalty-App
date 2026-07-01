"""Schemas for offers/promotions and redemptions."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import OfferStatus


class OfferOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    kind: str
    title: str
    description: str | None
    image_url: str | None
    segment: str | None
    start_at: datetime | None
    end_at: datetime | None
    status: str
    terms: str | None


class OfferCreate(BaseModel):
    title: str
    description: str | None = None
    image_url: str | None = None
    segment: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    terms: str | None = None


class OfferUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    image_url: str | None = None
    segment: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    terms: str | None = None
    status: OfferStatus | None = None


class RedemptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    player_id: UUID
    offer_id: UUID
    status: str
    redeemed_at: datetime
