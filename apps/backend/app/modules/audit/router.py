"""Audit + analytics read endpoints (permission-gated)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from .schemas import AuditLogOut
from .service import analytics_summary, list_audit

router = APIRouter()


@router.get(
    "/audit-logs",
    response_model=list[AuditLogOut],
    tags=["audit"],
    dependencies=[Depends(require(Permission.audit_logs_read.value))],
)
async def get_audit_logs(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[AuditLogOut]:
    return [AuditLogOut.model_validate(a) for a in await list_audit(session, tenant_id)]


@router.get(
    "/analytics/summary",
    response_model=dict[str, int],
    tags=["analytics"],
    dependencies=[Depends(require(Permission.analytics_read.value))],
)
async def get_analytics_summary(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> dict[str, int]:
    return await analytics_summary(session, tenant_id)
