"""Schemas for tenant config, themes, and the resolved manifest."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator

_VERSION_RE = re.compile(r"^\d+\.\d+(\.\d+)?$")


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
    min_app_version: str | None = None
    version: int


class TenantConfigUpdate(BaseModel):
    """Partial update — only provided fields change."""

    api_base_url: str | None = None
    feature_flags: dict[str, bool] | None = None
    endpoints: dict[str, Any] | None = None
    navigation: dict[str, Any] | None = None
    concierge: dict[str, Any] | None = None
    # Force-update floor (G8/M16), e.g. "1.2.0". None leaves it unchanged; "" clears it.
    min_app_version: str | None = None

    @field_validator("min_app_version")
    @classmethod
    def _valid_version(cls, value: str | None) -> str | None:
        if value is not None and value != "" and not _VERSION_RE.match(value):
            raise ValueError("min_app_version must look like MAJOR.MINOR[.PATCH]")
        return value


class AppearanceUpdate(BaseModel):
    """Appearance publish (P7.1) — gated by the branding permission, not tenant_config.

    `splash` is validated server-side (enums rejected on write, duration clamped 1800–3000,
    logo must be a tenant-owned media key); `navigation_style` writes `navigation.style`
    (sibling of tabs — the tab structure is never touched here).
    """

    splash: dict[str, Any] | None = None
    navigation_style: str | None = None
    # Curated open-license pairing key (P7.2) — never free-form families or uploads.
    typography_pairing: str | None = None


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


# ----------------------------------------------------------------- typed manifest (audit M6)
# The manifest is the single most business-critical payload — these models put its full shape
# into the OpenAPI contract so the generated client (and its drift check) covers it. Everything
# tenant-tunable is optional with server defaults; `extra="allow"` keeps additive fields from
# older/newer servers flowing through instead of being stripped.


class ManifestTypography(BaseModel):
    """Typography tokens (camelCase to mirror design/tokens.json)."""

    model_config = ConfigDict(extra="allow")

    fontFamily: dict[str, str] | None = None  # noqa: N815 - token key casing
    scale: dict[str, dict[str, Any]] | None = None


class ManifestTheme(BaseModel):
    """Design tokens (mirrors design/tokens.json). The app deep-merges these over its bundled
    defaults, so every group is optional."""

    model_config = ConfigDict(extra="allow")

    # Values are token groups ({"brand": {"gold": "#..."}}) or flat overrides ("gold": "#...").
    color: dict[str, dict[str, str] | str] | None = None
    colorLight: dict[str, dict[str, str] | str] | None = None  # noqa: N815 - token key casing
    typography: ManifestTypography | None = None
    spacing: dict[str, float] | None = None
    radius: dict[str, float] | None = None
    shadow: dict[str, str] | None = None
    components: dict[str, dict[str, Any]] | None = None


class ManifestNavTab(BaseModel):
    """One bottom-nav tab. Fields default to empty so a corrupt stored tab can never 500 the
    manifest endpoint — the app drops unknown/empty keys and falls back to Option B."""

    key: str = ""
    label: str = ""
    icon: str = ""
    requires_flag: str | None = None


class ManifestCenterAction(BaseModel):
    """The emphasized center action (Option B: Scan/Play with a wallet fallback)."""

    key: str = ""
    label: str = ""
    icon: str = ""
    requires_flag: str | None = None
    fallback: str | None = None


class ManifestNavGlobals(BaseModel):
    show_notifications: bool = False
    show_search: bool = False
    show_support: bool = False


class ManifestNavigation(BaseModel):
    model_config = ConfigDict(extra="allow")

    tabs: list[ManifestNavTab] = []
    center_action: ManifestCenterAction | None = None
    globals: ManifestNavGlobals | None = None
    # Versioned skin enum (P7.4); reads resolve tolerantly server-side (editorial fallback).
    style: str = "editorial"


class ManifestConcierge(BaseModel):
    """Concierge persona (P6.4) — public persona only; weights/guardrails stay server-side."""

    persona_name: str = "Concierge"
    tone: str = "warm"
    accent_token: str = "gold"


class ManifestSplash(BaseModel):
    """Resolved splash block (P7.1) — always present with safe defaults (variant `silk`)."""

    model_config = ConfigDict(extra="allow")

    schema_version: int = 1
    variant: str = "silk"
    logo_asset_id: str | None = None
    background_value: list[str] | None = None
    tagline_text: str | None = None
    animation_duration_ms: int | None = None
    environment_theme: str | None = None
    # journey terrain paths from the catalog: {"back": <svg path>, "front": <svg path>}
    environment_theme_paths: dict[str, str] | None = None


class ManifestOut(BaseModel):
    """The versioned, resolved tenant manifest — fully typed into the contract (M6)."""

    version: int
    tenant_id: UUID
    tenant_slug: str
    name: str
    theme: ManifestTheme
    feature_flags: dict[str, bool]
    endpoints: dict[str, str]
    navigation: ManifestNavigation
    # The `concierge` feature flag gates the UI; persona is config, never hardcoded (rule #5).
    concierge: ManifestConcierge | None = None
    splash: ManifestSplash
    # Curated pairing key (P7.2); its families are already resolved into theme.typography.
    typography_pairing: str
    # Force-update floor (G8/M16): builds below this route to ForceUpdateScreen.
    min_app_version: str | None = None
    updated_at: datetime | None
