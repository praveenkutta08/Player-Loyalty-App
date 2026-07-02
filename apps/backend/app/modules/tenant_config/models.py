"""Tenant configuration and themes (tenant-owned, RLS-enforced).

The manifest (GOLDEN RULE #5) is resolved from these: the active theme's tokens plus the tenant
config's feature flags, endpoints and navigation. A single ``version`` counter on the config is
bumped on every config/theme change so clients can cache-bust.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, Integer, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class TenantConfig(TenantOwnedMixin, BaseModel):
    __tablename__ = "tenant_configs"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_tenant_configs_tenant_id"),)

    api_base_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    feature_flags: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    endpoints: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    navigation: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    # Concierge config (P6.2/P6.4): scoring weights, persona, guardrails — tenant-tunable.
    concierge: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    # Appearance config (P7.1): {"splash": {...}} — versioned enums with read-side fallbacks.
    # navigation.style lives inside `navigation` (sibling of tabs). Typography pairing joins in
    # P7.2; Experience Packs later (roadmap §3.20).
    appearance: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    # Compliance kill switch (G8/M16): app builds below this version must force-update.
    min_app_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")


class Theme(TenantOwnedMixin, BaseModel):
    __tablename__ = "themes"

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    tokens: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    logo_ref: Mapped[str | None] = mapped_column(String(500), nullable=True)
    splash_ref: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
