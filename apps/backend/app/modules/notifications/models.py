"""Notification campaigns + per-recipient deliveries (tenant-owned, RLS)."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class NotificationStatus(enum.StrEnum):
    draft = "draft"
    scheduled = "scheduled"
    sent = "sent"


class DeliveryStatus(enum.StrEnum):
    delivered = "delivered"
    failed = "failed"


class Notification(TenantOwnedMixin, BaseModel):
    __tablename__ = "notifications"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    segment: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Deep-link payload routing the app, e.g. {"type": "offer", "id": "..."}.
    deep_link: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    schedule_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=NotificationStatus.draft.value, server_default="draft"
    )


class NotificationDelivery(TenantOwnedMixin, BaseModel):
    __tablename__ = "notification_deliveries"

    notification_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("notifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    receipt_ref: Mapped[str | None] = mapped_column(String(200), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
