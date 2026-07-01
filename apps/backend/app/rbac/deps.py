"""Current-admin resolution and the ``require("resource:action")`` route guard.

GOLDEN RULE #2: authorization is enforced here, server-side. Effective permissions are resolved
from the DB (roles -> role_permissions) on every request — never trusted from the token. Scoped
admins are constrained to their ``admin_user_tenants`` allow-list; only ``super_admin`` is global.
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.errors import ProblemException
from ..core.security import AUDIENCE_ADMIN, TOKEN_ACCESS, decode_token
from ..db.session import get_session
from ..modules.identity.models import (
    AdminUser,
    AdminUserTenant,
    Permission,
    Role,
    RolePermission,
    UserRole,
)
from ..tenancy.deps import set_tenant_context
from .matrix import UNRESTRICTED_ROLES


@dataclass
class AdminContext:
    """The authenticated admin and their resolved authorization state."""

    user: AdminUser
    role_keys: set[str]
    permission_keys: set[str]
    # None means unrestricted (global super-admin); otherwise the allow-listed tenant ids.
    allowed_tenant_ids: set[UUID] | None

    def has_permission(self, permission: str) -> bool:
        return permission in self.permission_keys

    def can_access_tenant(self, tenant_id: UUID) -> bool:
        return self.allowed_tenant_ids is None or tenant_id in self.allowed_tenant_ids


async def _bearer_token(authorization: Annotated[str | None, Header()] = None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ProblemException(401, "Not authenticated", detail="Missing bearer token.")
    return authorization.split(" ", 1)[1].strip()


async def get_current_admin(
    token: Annotated[str, Depends(_bearer_token)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> AdminContext:
    """Resolve the admin from an ``aud=admin`` access token and load their permissions."""
    payload = decode_token(token, audience=AUDIENCE_ADMIN, token_type=TOKEN_ACCESS)
    user_id = UUID(payload["sub"])

    user = await session.get(AdminUser, user_id)
    if user is None or not user.is_active:
        raise ProblemException(401, "Unknown or inactive user")

    role_keys = set(
        (
            await session.execute(
                select(Role.key)
                .join(UserRole, UserRole.role_id == Role.id)
                .where(UserRole.admin_user_id == user_id)
            )
        )
        .scalars()
        .all()
    )

    permission_keys = set(
        (
            await session.execute(
                select(Permission.key)
                .join(RolePermission, RolePermission.permission_id == Permission.id)
                .join(UserRole, UserRole.role_id == RolePermission.role_id)
                .where(UserRole.admin_user_id == user_id)
            )
        )
        .scalars()
        .all()
    )

    if role_keys & {role.value for role in UNRESTRICTED_ROLES}:
        allowed_tenant_ids: set[UUID] | None = None
    else:
        allowed_tenant_ids = set(
            (
                await session.execute(
                    select(AdminUserTenant.tenant_id).where(
                        AdminUserTenant.admin_user_id == user_id
                    )
                )
            )
            .scalars()
            .all()
        )

    return AdminContext(
        user=user,
        role_keys=role_keys,
        permission_keys=permission_keys,
        allowed_tenant_ids=allowed_tenant_ids,
    )


AdminContextDep = Annotated[AdminContext, Depends(get_current_admin)]


def require(permission: str) -> Callable[[AdminContext], Awaitable[AdminContext]]:
    """Return a dependency that enforces the given ``resource:action`` permission."""

    async def _guard(ctx: AdminContextDep) -> AdminContext:
        if not ctx.has_permission(permission):
            raise ProblemException(
                403, "Forbidden", detail=f"Missing required permission: {permission}"
            )
        return ctx

    return _guard


async def get_admin_tenant_id(
    ctx: AdminContextDep,
    x_tenant: Annotated[UUID | None, Header(alias="X-Tenant")] = None,
) -> UUID:
    """Resolve the admin's acting tenant from ``X-Tenant`` and verify it is allowed."""
    if x_tenant is None:
        raise ProblemException(400, "Tenant required", detail="The X-Tenant header is required.")
    if not ctx.can_access_tenant(x_tenant):
        raise ProblemException(403, "Forbidden", detail="Tenant not in your allow-list.")
    return x_tenant


AdminTenantIdDep = Annotated[UUID, Depends(get_admin_tenant_id)]


async def get_admin_tenant_session(
    session: Annotated[AsyncSession, Depends(get_session)],
    tenant_id: AdminTenantIdDep,
) -> AsyncIterator[AsyncSession]:
    """Yield a session bound (RLS-enforced) to the admin's validated acting tenant."""
    await set_tenant_context(session, tenant_id)
    yield session


AdminTenantSessionDep = Annotated[AsyncSession, Depends(get_admin_tenant_session)]
