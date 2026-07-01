"""Offers & promotions (one table with a ``kind``) + the player redemption ledger.

Design note: offers and promotions share one ``offers`` table distinguished by ``kind`` — they have
identical fields and lifecycle; only the admin permission set differs (offers:* vs promotions:*),
which is enforced by separate endpoint groups. Both are tenant-owned (RLS).
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class OfferKind(enum.StrEnum):
    offer = "offer"
    promotion = "promotion"


class OfferStatus(enum.StrEnum):
    draft = "draft"
    published = "published"
    archived = "archived"


class RedemptionStatus(enum.StrEnum):
    redeemed = "redeemed"
    void = "void"


class Offer(TenantOwnedMixin, BaseModel):
    __tablename__ = "offers"

    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    segment: Mapped[str | None] = mapped_column(String(100), nullable=True)
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=OfferStatus.draft.value, server_default="draft"
    )
    terms: Mapped[str | None] = mapped_column(Text, nullable=True)


class PlayerOffer(TenantOwnedMixin, BaseModel):
    """Append-only redemption ledger; one active redemption per (player, offer)."""

    __tablename__ = "player_offers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "player_id", "offer_id", name="uq_player_offers_unique"),
    )

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    offer_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("offers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=RedemptionStatus.redeemed.value,
        server_default="redeemed",
    )
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(200), nullable=True)
