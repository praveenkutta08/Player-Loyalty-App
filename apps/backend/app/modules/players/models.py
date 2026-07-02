"""Player identity (tenant-owned, RLS-enforced) and one-time passcodes.

Players are the mobile audience. Both tables are tenant-owned, so RLS isolates them per tenant;
the migration enables the tenant-isolation policy via the P1.3 helper.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class PlayerStatus(enum.StrEnum):
    active = "active"
    suspended = "suspended"
    pending = "pending"


class KycState(enum.StrEnum):
    unstarted = "unstarted"
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    review = "review"


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
    kyc_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=KycState.unstarted.value, server_default="unstarted"
    )
    # Explicit opt-in for location features (GOLDEN RULE #8 — consent).
    location_consent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Concierge (P6.1): stored home/origin for drive-time math — {"lat", "lng", "label"}.
    # Requires its own explicit consent, separate from location_consent.
    home_origin: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    concierge_consent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Responsible gaming flags (P6.3): {"self_exclusion": bool, "cool_off_until": iso,
    # "limits": {...}}. Any active flag → NO proactive visit nudges (neutral concierge).
    rg_flags: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)


class Device(TenantOwnedMixin, BaseModel):
    """A player's push-notification device (also used by the notifications module)."""

    __tablename__ = "devices"
    __table_args__ = (
        UniqueConstraint("tenant_id", "push_token", name="uq_devices_tenant_id_push_token"),
    )

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    platform: Mapped[str] = mapped_column(String(16), nullable=False)
    push_token: Mapped[str] = mapped_column(String(500), nullable=False)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PlayerOtp(TenantOwnedMixin, BaseModel):
    __tablename__ = "player_otps"

    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
