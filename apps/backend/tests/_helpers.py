"""Async seeding helpers for auth/RBAC tests (run as the superuser owner; RLS bypassed)."""

from __future__ import annotations

import uuid
from collections.abc import Sequence

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.modules.identity.models import AdminUser, AdminUserTenant, Role, UserRole
from app.modules.players.models import Player
from app.modules.tenants.models import Tenant
from sqlalchemy import select


def unique(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


async def create_tenant(name: str | None = None) -> Tenant:
    async with SessionLocal() as session:
        tenant = Tenant(name=name or unique("Tenant"), slug=unique("slug"))
        session.add(tenant)
        await session.commit()
        await session.refresh(tenant)
        return tenant


async def create_admin(
    email: str,
    password: str,
    role_key: str,
    allowed_tenant_ids: Sequence[uuid.UUID] | None = None,
) -> AdminUser:
    async with SessionLocal() as session:
        role_id = (await session.execute(select(Role.id).where(Role.key == role_key))).scalar_one()

        user = AdminUser(email=email.lower(), password_hash=hash_password(password), is_active=True)
        session.add(user)
        await session.flush()

        session.add(UserRole(admin_user_id=user.id, role_id=role_id))
        for tenant_id in allowed_tenant_ids or []:
            session.add(AdminUserTenant(admin_user_id=user.id, tenant_id=tenant_id))

        await session.commit()
        await session.refresh(user)
        return user


async def admin_headers(
    api: object,
    *,
    role: str = "super_admin",
    tenant_id: uuid.UUID | None = None,
    allowed_tenant_ids: Sequence[uuid.UUID] | None = None,
) -> dict[str, str]:
    """Create an admin with the given role, log in, and return auth headers (+ X-Tenant)."""
    email = f"{unique(role)}@example.com"
    await create_admin(email, "pw", role, allowed_tenant_ids=allowed_tenant_ids)
    resp = await api.post(  # type: ignore[attr-defined]
        "/api/v1/auth/admin/login", json={"email": email, "password": "pw"}
    )
    headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    if tenant_id is not None:
        headers["X-Tenant"] = str(tenant_id)
    return headers


async def player_token(
    api: object, tenant_id: uuid.UUID, email: str | None = None, password: str = "pw"
) -> str:
    """Create a player in the tenant, log in, and return the access token."""
    email = email or f"{unique('player')}@example.com"
    await create_player(tenant_id, email, password=password)
    resp = await api.post(  # type: ignore[attr-defined]
        "/api/v1/auth/player/login",
        json={"email": email, "password": password},
        headers={"X-Tenant": str(tenant_id)},
    )
    return resp.json()["access_token"]


async def create_player(
    tenant_id: uuid.UUID,
    email: str,
    password: str | None = None,
    segment: str | None = None,
) -> Player:
    async with SessionLocal() as session:
        player = Player(
            tenant_id=tenant_id,
            email=email.lower(),
            password_hash=hash_password(password) if password else None,
            segment=segment,
        )
        session.add(player)
        await session.commit()
        await session.refresh(player)
        return player
