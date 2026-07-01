"""Digital room keys (tenant-owned, RLS). Issued against a valid hotel reservation."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class DigitalKeyStatus(enum.StrEnum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class DigitalKey(TenantOwnedMixin, BaseModel):
    __tablename__ = "digital_keys"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    reservation_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("reservations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    room: Mapped[str] = mapped_column(String(30), nullable=False)
    provider: Mapped[str] = mapped_column(
        String(30), nullable=False, default="mock", server_default="mock"
    )
    mobile_key_ref: Mapped[str] = mapped_column(String(200), nullable=False)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=DigitalKeyStatus.active.value, server_default="active"
    )
