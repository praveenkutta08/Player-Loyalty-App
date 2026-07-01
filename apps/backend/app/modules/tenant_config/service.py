"""Tenant config + theme services and manifest resolution. All queries are RLS-scoped."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ..tenants.models import Tenant
from .models import TenantConfig, Theme
from .schemas import ManifestOut, TenantConfigUpdate, ThemeCreate, ThemeUpdate

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
    for key, value in fields.items():
        setattr(config, key, value)
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
    navigation = config.navigation if (config and config.navigation) else DEFAULT_NAVIGATION
    endpoints: dict[str, Any] = dict(config.endpoints) if config else {}
    if config and config.api_base_url:
        endpoints.setdefault("api_base_url", config.api_base_url)

    updated_candidates: list[datetime] = []
    if config is not None:
        updated_candidates.append(config.updated_at)
    if active_theme is not None:
        updated_candidates.append(active_theme.updated_at)

    return ManifestOut(
        version=version,
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        name=tenant.name,
        theme=active_theme.tokens if active_theme else {},
        feature_flags=feature_flags,
        endpoints=endpoints,
        navigation=navigation,
        updated_at=max(updated_candidates) if updated_candidates else None,
    )
