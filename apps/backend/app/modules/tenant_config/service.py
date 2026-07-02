"""Tenant config + theme services and manifest resolution. All queries are RLS-scoped."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ..tenants.models import Tenant
from .appearance import (
    apply_typography_pairing,
    resolve_nav_style_read,
    resolve_splash_read,
    resolve_typography_pairing_read,
    validate_nav_style_write,
    validate_splash_write,
    validate_typography_pairing_write,
)
from .models import TenantConfig, Theme
from .schemas import AppearanceUpdate, ManifestOut, TenantConfigUpdate, ThemeCreate, ThemeUpdate

# Sensible default bottom navigation shipped when a tenant hasn't customised it.
DEFAULT_NAVIGATION: dict[str, Any] = {
    "tabs": [
        {"key": "home", "label": "Home", "icon": "home"},
        {"key": "offers", "label": "Offers", "icon": "gift"},
        {"key": "wallet", "label": "Wallet", "icon": "wallet"},
        {"key": "account", "label": "Account", "icon": "user"},
    ],
    "center_action": {"key": "play", "label": "Play", "icon": "dice"},
    "globals": {"show_notifications": True, "show_support": True},
}


async def get_config(session: AsyncSession, tenant_id: UUID) -> TenantConfig | None:
    return (
        await session.execute(select(TenantConfig).where(TenantConfig.tenant_id == tenant_id))
    ).scalar_one_or_none()


async def get_or_create_config(session: AsyncSession, tenant_id: UUID) -> TenantConfig:
    config = await get_config(session, tenant_id)
    if config is None:
        config = TenantConfig(tenant_id=tenant_id)
        session.add(config)
        await session.flush()
    return config


async def update_config(
    session: AsyncSession, tenant_id: UUID, data: TenantConfigUpdate
) -> TenantConfig:
    config = await get_or_create_config(session, tenant_id)
    fields = data.model_dump(exclude_unset=True)
    # navigation.style is a versioned enum (P7.1): reject unknown values on WRITE. Reads fall
    # back to the default, so a stale admin can never brick the app.
    navigation = fields.get("navigation")
    if isinstance(navigation, dict) and "style" in navigation:
        navigation["style"] = validate_nav_style_write(navigation["style"])
    # Empty string clears the force-update floor (None means "leave unchanged").
    if fields.get("min_app_version") == "":
        fields["min_app_version"] = None
    for key, value in fields.items():
        setattr(config, key, value)
    config.version += 1
    await session.flush()
    return config


async def update_appearance(
    session: AsyncSession, tenant_id: UUID, data: AppearanceUpdate
) -> TenantConfig:
    """Validate + persist the appearance block (P7.1); every publish bumps the manifest."""
    config = await get_or_create_config(session, tenant_id)
    appearance = dict(config.appearance or {})
    if data.splash is not None:
        appearance["splash"] = validate_splash_write(data.splash, tenant_id)
    if data.typography_pairing is not None:
        appearance["typography"] = {
            "pairing": validate_typography_pairing_write(data.typography_pairing)
        }
    config.appearance = appearance
    if data.navigation_style is not None:
        config.navigation = {
            **(config.navigation or {}),
            "style": validate_nav_style_write(data.navigation_style),
        }
    config.version += 1
    await session.flush()
    return config


async def bump_version(session: AsyncSession, tenant_id: UUID) -> None:
    """Increment the tenant's manifest version so clients refetch (used across modules)."""
    config = await get_or_create_config(session, tenant_id)
    config.version += 1
    await session.flush()


async def list_themes(session: AsyncSession, tenant_id: UUID) -> list[Theme]:
    return list(
        (await session.execute(select(Theme).where(Theme.tenant_id == tenant_id))).scalars().all()
    )


async def _get_theme(session: AsyncSession, tenant_id: UUID, theme_id: UUID) -> Theme:
    theme = (
        await session.execute(
            select(Theme).where(Theme.id == theme_id, Theme.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if theme is None:
        raise ProblemException(404, "Theme not found")
    return theme


async def _deactivate_other_themes(session: AsyncSession, tenant_id: UUID, keep_id: UUID) -> None:
    await session.execute(
        update(Theme)
        .where(Theme.tenant_id == tenant_id, Theme.id != keep_id, Theme.is_active.is_(True))
        .values(is_active=False)
    )


async def create_theme(session: AsyncSession, tenant_id: UUID, data: ThemeCreate) -> Theme:
    theme = Theme(tenant_id=tenant_id, **data.model_dump())
    session.add(theme)
    await session.flush()
    if theme.is_active:
        await _deactivate_other_themes(session, tenant_id, theme.id)
    await bump_version(session, tenant_id)
    return theme


async def update_theme(
    session: AsyncSession, tenant_id: UUID, theme_id: UUID, data: ThemeUpdate
) -> Theme:
    theme = await _get_theme(session, tenant_id, theme_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(theme, key, value)
    await session.flush()
    if theme.is_active:
        await _deactivate_other_themes(session, tenant_id, theme.id)
    await bump_version(session, tenant_id)
    return theme


async def activate_theme(session: AsyncSession, tenant_id: UUID, theme_id: UUID) -> Theme:
    theme = await _get_theme(session, tenant_id, theme_id)
    theme.is_active = True
    await session.flush()
    await _deactivate_other_themes(session, tenant_id, theme.id)
    await bump_version(session, tenant_id)
    return theme


async def delete_theme(session: AsyncSession, tenant_id: UUID, theme_id: UUID) -> None:
    theme = await _get_theme(session, tenant_id, theme_id)
    await session.delete(theme)
    await bump_version(session, tenant_id)


async def resolve_manifest(session: AsyncSession, tenant: Tenant) -> ManifestOut:
    """Build the resolved manifest from the active theme + tenant config (read-only)."""
    config = await get_config(session, tenant.id)
    active_theme = (
        await session.execute(
            select(Theme).where(Theme.tenant_id == tenant.id, Theme.is_active.is_(True)).limit(1)
        )
    ).scalar_one_or_none()

    version = config.version if config else 1
    feature_flags = config.feature_flags if config else {}
    # Merge stored navigation OVER the defaults so a partial write (e.g. only `style`) never
    # drops the Option B tab structure.
    stored_navigation = dict(config.navigation) if (config and config.navigation) else {}
    navigation = {**DEFAULT_NAVIGATION, **stored_navigation}
    # navigation.style + splash resolve tolerantly (P7.1): unknown/corrupt values fall back to
    # the documented defaults (editorial / silk) — the manifest endpoint never 500s on config.
    navigation["style"] = resolve_nav_style_read(navigation.get("style"))
    appearance = (config.appearance or {}) if config else {}
    splash = resolve_splash_read(appearance.get("splash"))
    typography_pairing = resolve_typography_pairing_read(
        (appearance.get("typography") or {}).get("pairing")
    )
    endpoints: dict[str, Any] = dict(config.endpoints) if config else {}
    if config and config.api_base_url:
        endpoints.setdefault("api_base_url", config.api_base_url)

    updated_candidates: list[datetime] = []
    if config is not None:
        updated_candidates.append(config.updated_at)
    if active_theme is not None:
        updated_candidates.append(active_theme.updated_at)

    # Concierge persona block (P6.4) — snake_case like the rest of the manifest; the app's
    # normalizer camelCases it. Only the persona is public; weights/guardrails stay server-side.
    concierge: dict[str, Any] | None = None
    if config is not None and config.concierge:
        persona = config.concierge.get("persona") or {}
        concierge = {
            "persona_name": persona.get("name", "Concierge"),
            "tone": persona.get("tone", "warm"),
            "accent_token": persona.get("accent_token", "gold"),
        }

    # The pairing enum resolves into the theme tokens' fontFamily (P7.2) so every existing
    # token consumer picks the curated fonts up with no client changes.
    theme_tokens = apply_typography_pairing(
        active_theme.tokens if active_theme else {}, typography_pairing
    )

    return ManifestOut(
        version=version,
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        name=tenant.name,
        theme=theme_tokens,
        feature_flags=feature_flags,
        endpoints=endpoints,
        navigation=navigation,
        concierge=concierge,
        splash=splash,
        typography_pairing=typography_pairing,
        min_app_version=config.min_app_version if config else None,
        updated_at=max(updated_candidates) if updated_candidates else None,
    )
