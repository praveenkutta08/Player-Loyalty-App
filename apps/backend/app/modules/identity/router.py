"""Admin auth + a permission-gated tenants list that demonstrates tenant scoping."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...core.ratelimit import (
    enforce_auth_rate_limit,
    enforce_login_backoff,
    record_login_failure,
)
from ...core.security import AUDIENCE_ADMIN
from ...core.settings import get_settings
from ...db.session import get_session
from ...rbac.deps import AdminContext, AdminContextDep, require
from ...rbac.matrix import Permission
from ..tenants.models import Tenant
from .schemas import (
    AdminAuthOut,
    AdminLoginRequest,
    AdminMeOut,
    RefreshRequest,
    TenantOut,
)
from .service import (
    authenticate_admin,
    issue_token_pair,
    revoke_refresh_token,
    rotate_refresh_token,
)

router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


def _set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Deliver the admin refresh token as an httpOnly, SameSite=Strict cookie (H5).

    httpOnly keeps it out of reach of any injected script (XSS can't read it); SameSite=Strict
    blocks it from cross-site requests; the path scopes it to the admin-auth endpoints so it is
    never attached to ordinary API calls.
    """
    settings = get_settings()
    response.set_cookie(
        key=settings.admin_refresh_cookie_name,
        value=refresh_token,
        max_age=settings.jwt_refresh_ttl_days * 24 * 60 * 60,
        httponly=True,
        secure=settings.admin_cookie_secure,
        samesite="strict",
        path=settings.admin_refresh_cookie_path,
    )


def _clear_refresh_cookie(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(
        key=settings.admin_refresh_cookie_name,
        httponly=True,
        secure=settings.admin_cookie_secure,
        samesite="strict",
        path=settings.admin_refresh_cookie_path,
    )


def _presented_refresh(request: Request, body: RefreshRequest | None) -> str | None:
    """The refresh token to act on: an explicit body value wins (programmatic clients), else the
    httpOnly cookie the browser sends automatically (H5)."""
    if body is not None and body.refresh_token:
        return body.refresh_token
    return request.cookies.get(get_settings().admin_refresh_cookie_name)


@router.post("/auth/admin/login", response_model=AdminAuthOut, tags=["auth"])
async def admin_login(
    request: Request, body: AdminLoginRequest, session: SessionDep, response: Response
) -> AdminAuthOut:
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
    pair = await issue_token_pair(session, user.id, AUDIENCE_ADMIN)
    _set_refresh_cookie(response, pair.refresh_token)
    return AdminAuthOut(access_token=pair.access_token)


@router.post("/auth/admin/refresh", response_model=AdminAuthOut, tags=["auth"])
async def admin_refresh(
    request: Request, session: SessionDep, response: Response, body: RefreshRequest | None = None
) -> AdminAuthOut:
    # audit: exempt — authentication flow, not a privileged mutation (rate-limited, H4).
    refresh_token = _presented_refresh(request, body)
    if not refresh_token:
        raise ProblemException(401, "Missing refresh token")
    # On failure the raised ProblemException is rendered by the exception handler (which replaces
    # this response), so a stale cookie is simply left to expire — the SPA logs the user out.
    pair = await rotate_refresh_token(session, refresh_token, AUDIENCE_ADMIN)
    _set_refresh_cookie(response, pair.refresh_token)
    return AdminAuthOut(access_token=pair.access_token)


@router.post("/auth/admin/logout", status_code=status.HTTP_204_NO_CONTENT, tags=["auth"])
async def admin_logout(
    request: Request, session: SessionDep, response: Response, body: RefreshRequest | None = None
) -> None:
    # audit: exempt — session teardown, not a privileged mutation. Revokes the token family (M1).
    refresh_token = _presented_refresh(request, body)
    if refresh_token:
        await revoke_refresh_token(session, refresh_token, AUDIENCE_ADMIN)
    _clear_refresh_cookie(response)


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
