"""Schemas for the rewards marketplace."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .models import RewardStatus


class RewardItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    image_url: str | None
    category: str | None
    points_cost: int
    stock: int | None
    status: str
    terms: str | None


class RewardItemPage(BaseModel):
    """Cursor-paginated admin rewards catalog (M2)."""

    items: list[RewardItemOut]
    next_cursor: str | None = None
    has_more: bool = False


class RewardItemCreate(BaseModel):
    title: str
    image_url: str | None = None
    category: str | None = None
    points_cost: int = Field(ge=0)
    stock: int | None = None
    terms: str | None = None


class RewardItemUpdate(BaseModel):
    title: str | None = None
    image_url: str | None = None
    category: str | None = None
    points_cost: int | None = Field(default=None, ge=0)
    stock: int | None = None
    status: RewardStatus | None = None
    terms: str | None = None


class RedemptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    reward_item_id: UUID
    points_spent: int
    status: str
    redeemed_at: datetime


class RedemptionPage(BaseModel):
    """Cursor-paginated player redemption history (M2)."""

    items: list[RedemptionOut]
    next_cursor: str | None = None
    has_more: bool = False
