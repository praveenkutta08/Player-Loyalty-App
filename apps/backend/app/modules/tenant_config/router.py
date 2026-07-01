"""Tenant config + theme CRUD (permission-gated) and the public versioned manifest endpoint."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...db.session import get_session
from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ...tenancy.deps import set_tenant_context
from ..tenants.models import Tenant
from .schemas import (
    ManifestOut,
    TenantConfigOut,
    TenantConfigUpdate,
    ThemeCreate,
    ThemeOut,
    ThemeUpdate,
)
from .service import activate_theme as activate_theme_service
from .service import (
    create_theme,
    delete_theme,
    get_or_create_config,
    list_themes,
    resolve_manifest,
    update_config,
    update_theme,
)

router = APIRouter()

SessionDep = Annotated[AsyncSession, Depends(get_session)]


# --------------------------------------------------------------------------- config
@router.get(
    "/config",
    response_model=TenantConfigOut,
    tags=["config"],
    dependencies=[Depends(require(Permission.tenant_config_read.value))],
)
async def read_config(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> TenantConfigOut:
    config = await get_or_create_config(session, tenant_id)
    return TenantConfigOut.model_validate(config)


@router.put(
    "/config",
    response_model=TenantConfigOut,
    tags=["config"],
    dependencies=[Depends(require(Permission.tenant_config_update.value))],
)
async def put_config(
    body: TenantConfigUpdate, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> TenantConfigOut:
    config = await update_config(session, tenant_id, body)
    return TenantConfigOut.model_validate(config)


# --------------------------------------------------------------------------- themes
@router.get(
    "/config/themes",
    response_model=list[ThemeOut],
    tags=["themes"],
    dependencies=[Depends(require(Permission.branding_read.value))],
)
async def get_themes(session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep) -> list[ThemeOut]:
    return [ThemeOut.model_validate(t) for t in await list_themes(session, tenant_id)]


@router.post(
    "/config/themes",
    response_model=ThemeOut,
    status_code=status.HTTP_201_CREATED,
    tags=["themes"],
    dependencies=[Depends(require(Permission.branding_create.value))],
)
async def post_theme(
    body: ThemeCreate, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> ThemeOut:
    return ThemeOut.model_validate(await create_theme(session, tenant_id, body))


@router.put(
    "/config/themes/{theme_id}",
    response_model=ThemeOut,
    tags=["themes"],
    dependencies=[Depends(require(Permission.branding_update.value))],
)
async def put_theme(
    theme_id: UUID,
    body: ThemeUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
) -> ThemeOut:
    return ThemeOut.model_validate(await update_theme(session, tenant_id, theme_id, body))


@router.post(
    "/config/themes/{theme_id}/activate",
    response_model=ThemeOut,
    tags=["themes"],
    dependencies=[Depends(require(Permission.branding_update.value))],
)
async def activate_theme(
    theme_id: UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> ThemeOut:
    return ThemeOut.model_validate(await activate_theme_service(session, tenant_id, theme_id))


@router.delete(
    "/config/themes/{theme_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["themes"],
    dependencies=[Depends(require(Permission.branding_delete.value))],
)
async def remove_theme(
    theme_id: UUID, session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> None:
    await delete_theme(session, tenant_id, theme_id)


# --------------------------------------------------------------------------- manifest (public)
@router.get("/config/manifest", response_model=ManifestOut, tags=["config"])
async def get_manifest(
    request: Request,
    response: Response,
    session: SessionDep,
    x_tenant: Annotated[UUID | None, Header(alias="X-Tenant")] = None,
) -> ManifestOut | Response:
    """Return the resolved, versioned manifest for the tenant (public; cache-friendly via ETag)."""
    if x_tenant is None:
        raise ProblemException(400, "Tenant required", detail="The X-Tenant header is required.")
    tenant = await session.get(Tenant, x_tenant)
    if tenant is None:
        raise ProblemException(404, "Tenant not found")
    if tenant.status != "active":
        raise ProblemException(403, "Tenant is not active")

    await set_tenant_context(session, tenant.id)
    manifest = await resolve_manifest(session, tenant)

    etag = f'"{tenant.id}.{manifest.version}"'
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": "no-cache"})

    response.headers["ETag"] = etag
    response.headers["Cache-Control"] = "no-cache"
    return manifest
