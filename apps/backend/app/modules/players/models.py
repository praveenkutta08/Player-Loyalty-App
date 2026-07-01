"""Player identity (tenant-owned, RLS-enforced) and one-time passcodes.

Players are the mobile audience. Both tables are tenant-owned, so RLS isolates them per tenant;
the migration enables the tenant-isolation policy via the P1.3 helper.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class PlayerStatus(enum.StrEnum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class Player(TenantOwnedMixin, BaseModel):
    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("tenant_id", "email", name="uq_players_tenant_id_email"),)

    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Marketing segment used for content/offer targeting (null = default audience).
    segment: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Nullable: OTP-only players may never set a password.
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=PlayerStatus.active.value, server_default="active"
    )


class PlayerOtp(TenantOwnedMixin, BaseModel):
    __tablename__ = "player_otps"

    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
