"""Tenancy dependency: resolve the current tenant and bind it to the DB connection.

For now the tenant is taken from the ``X-Tenant`` header (super-admin style); from P1.4 the player
and admin tokens will carry the tenant claim. Whatever the source, :func:`set_tenant_context`
switches the connection into the non-privileged ``app_rls`` role and sets the tenant GUC so RLS
policies filter every subsequent query in the request's transaction.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.errors import ProblemException
from ..db.rls import APP_RLS_ROLE, TENANT_GUC
from ..db.session import get_session


async def set_tenant_context(session: AsyncSession, tenant_id: UUID) -> None:
    """Switch to the RLS role and set the tenant GUC for the current transaction."""
    # Role name is a trusted constant (never user input).
    await session.execute(text(f"SET LOCAL ROLE {APP_RLS_ROLE}"))
    await session.execute(
        text(f"SELECT set_config('{TENANT_GUC}', :tenant_id, true)"),
        {"tenant_id": str(tenant_id)},
    )


async def get_current_tenant_id(
    x_tenant: Annotated[UUID | None, Header(alias="X-Tenant")] = None,
) -> UUID:
    """Resolve the current tenant id from the request (header for now)."""
    if x_tenant is None:
        raise ProblemException(
            400,
            "Tenant required",
            detail="The X-Tenant header is required to access tenant-scoped resources.",
        )
    return x_tenant


async def get_tenant_session(
    session: Annotated[AsyncSession, Depends(get_session)],
    tenant_id: Annotated[UUID, Depends(get_current_tenant_id)],
) -> AsyncIterator[AsyncSession]:
    """Yield a session already bound to the current tenant (RLS-enforced)."""
    await set_tenant_context(session, tenant_id)
    yield session


TenantSessionDep = Annotated[AsyncSession, Depends(get_tenant_session)]
