"""Schemas for tenant config, themes, and the resolved manifest."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TenantConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    api_base_url: str | None
    feature_flags: dict[str, Any]
    endpoints: dict[str, Any]
    navigation: dict[str, Any]
    concierge: dict[str, Any]
    appearance: dict[str, Any]
    version: int


class TenantConfigUpdate(BaseModel):
    """Partial update — only provided fields change."""

    api_base_url: str | None = None
    feature_flags: dict[str, bool] | None = None
    endpoints: dict[str, Any] | None = None
    navigation: dict[str, Any] | None = None
    concierge: dict[str, Any] | None = None


class AppearanceUpdate(BaseModel):
    """Appearance publish (P7.1) — gated by the branding permission, not tenant_config.

    `splash` is validated server-side (enums rejected on write, duration clamped 1800–3000,
    logo must be a tenant-owned media key); `navigation_style` writes `navigation.style`
    (sibling of tabs — the tab structure is never touched here).
    """

    splash: dict[str, Any] | None = None
    navigation_style: str | None = None


class ThemeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    tokens: dict[str, Any]
    logo_ref: str | None
    splash_ref: str | None
    is_active: bool


class ThemeCreate(BaseModel):
    name: str
    tokens: dict[str, Any] = {}
    logo_ref: str | None = None
    splash_ref: str | None = None
    is_active: bool = False


class ThemeUpdate(BaseModel):
    name: str | None = None
    tokens: dict[str, Any] | None = None
    logo_ref: str | None = None
    splash_ref: str | None = None
    is_active: bool | None = None


class ManifestOut(BaseModel):
    """The versioned, resolved tenant manifest (matches @repo/shared-types TenantManifest)."""

    version: int
    tenant_id: UUID
    tenant_slug: str
    name: str
    theme: dict[str, Any]
    feature_flags: dict[str, Any]
    endpoints: dict[str, Any]
    navigation: dict[str, Any]
    # Concierge persona for the app (P6.4): {"persona_name", "tone", "accent_token"}.
    # The `concierge` feature flag gates the UI; persona is config, never hardcoded (rule #5).
    concierge: dict[str, Any] | None = None
    # Resolved splash block (P7.1): always present with safe defaults (variant falls back to
    # "silk"); `journey` additionally carries its environment terrain paths from the catalog.
    splash: dict[str, Any]
    updated_at: datetime | None
