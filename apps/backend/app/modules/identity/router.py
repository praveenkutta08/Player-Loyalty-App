"""Admin auth + a permission-gated tenants list that demonstrates tenant scoping."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...core.ratelimit import (
    enforce_auth_rate_limit,
    enforce_login_backoff,
    record_login_failure,
)
from ...core.security import AUDIENCE_ADMIN
from ...db.session import get_session
from ...rbac.deps import AdminContext, AdminContextDep, require
from ...rbac.matrix import Permission
from ..tenants.models import Tenant
from .schemas import AdminLoginRequest, AdminMeOut, RefreshRequest, TenantOut, TokenPair
from .service import authenticate_admin, issue_token_pair, rotate_refresh_token

router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.post("/auth/admin/login", response_model=TokenPair, tags=["auth"])
async def admin_login(
    request: Request, body: AdminLoginRequest, session: SessionDep
) -> TokenPair:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    await enforce_auth_rate_limit(request, "admin_login", body.email)
    # Lockout backoff: repeated failed credentials for the same account get a 429 window.
    await enforce_login_backoff(body.email, scope="admin_login_fail")
    try:
        user = await authenticate_admin(session, body.email, body.password)
    except ProblemException as exc:
        if exc.status == 401:
            await record_login_failure(body.email, scope="admin_login_fail")
        raise
    return await issue_token_pair(session, user.id, AUDIENCE_ADMIN)


@router.post("/auth/admin/refresh", response_model=TokenPair, tags=["auth"])
async def admin_refresh(body: RefreshRequest, session: SessionDep) -> TokenPair:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    return await rotate_refresh_token(session, body.refresh_token, AUDIENCE_ADMIN)


@router.get("/auth/admin/me", response_model=AdminMeOut, tags=["auth"])
async def admin_me(ctx: AdminContextDep) -> AdminMeOut:
    return AdminMeOut(
        id=ctx.user.id,
        email=ctx.user.email,
        full_name=ctx.user.full_name,
        roles=sorted(ctx.role_keys),
        permissions=sorted(ctx.permission_keys),
        allowed_tenant_ids=(
            None if ctx.allowed_tenant_ids is None else sorted(ctx.allowed_tenant_ids)
        ),
    )


@router.get("/tenants", response_model=list[TenantOut], tags=["tenants"])
async def list_tenants(
    session: SessionDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.tenants_read.value))],
) -> list[TenantOut]:
    """List tenants the caller may read; scoped admins see only their allow-list."""
    query = select(Tenant)
    if ctx.allowed_tenant_ids is not None:
        query = query.where(Tenant.id.in_(ctx.allowed_tenant_ids))
    tenants = (await session.execute(query)).scalars().all()
    return [TenantOut.model_validate(t) for t in tenants]
