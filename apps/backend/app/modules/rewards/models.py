"""Rewards marketplace: reward_items + append-only reward_redemptions (tenant-owned, RLS)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class RewardStatus(enum.StrEnum):
    draft = "draft"
    published = "published"


class RewardItem(TenantOwnedMixin, BaseModel):
    __tablename__ = "reward_items"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    points_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    # Null = unlimited stock.
    stock: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=RewardStatus.draft.value, server_default="draft"
    )
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)


class RewardRedemption(TenantOwnedMixin, BaseModel):
    __tablename__ = "reward_redemptions"
    __table_args__ = (
        UniqueConstraint("tenant_id", "idempotency_key", name="uq_reward_redemptions_idem"),
    )

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    reward_item_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("reward_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    points_spent: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="completed", server_default="completed"
    )
    idempotency_key: Mapped[str] = mapped_column(String(200), nullable=False)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
