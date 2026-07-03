"""Audit + analytics endpoints: admin reads (permission-gated) and the player event sink."""

from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...db.session import get_session
from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import AuditLogOut, AuditLogPage
from .service import analytics_summary, list_audit, record_event

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]

# Client-reportable event types (P6.7 concierge metrics + room for future UI events). An
# allowlist keeps the sink from becoming a free-form logging endpoint.
CLIENT_EVENT_TYPES = {
    "answer_accepted",  # hero CTA tap — the headline concierge metric
    "for_you_offer_click",  # vs list_offer_click = the CTR-lift experiment pair
    "list_offer_click",
    "ask_to_action",  # an Ask answer led to a plan/action
    "brief_render_ms",  # perceived time-to-first-answer (target < 1500)
}


class ClientEventIn(BaseModel):
    type: str = Field(max_length=50)
    entity_id: UUID | None = None
    meta: dict[str, Any] | None = None


class ClientEventOut(BaseModel):
    accepted: bool


@router.post("/analytics/events", response_model=ClientEventOut, tags=["analytics"])
async def post_client_event(
    body: ClientEventIn, session: SessionDep, player: PlayerDep
) -> ClientEventOut:
    """Player-audience event sink (P2.9 sink, P6.7 metrics). Unknown types are dropped, not
    stored — the response says so instead of erroring, so clients can fire-and-forget."""
    # audit: exempt — anonymous-grade UI telemetry (allowlisted types), not privileged/financial.
    if body.type not in CLIENT_EVENT_TYPES:
        return ClientEventOut(accepted=False)
    await record_event(
        session,
        tenant_id=player.tenant_id,
        type=body.type,
        player_id=player.id,
        entity_id=body.entity_id,
        meta=body.meta,
    )
    return ClientEventOut(accepted=True)


@router.get(
    "/audit-logs",
    response_model=AuditLogPage,
    tags=["audit"],
    dependencies=[Depends(require(Permission.audit_logs_read.value))],
)
async def get_audit_logs(
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    cursor: str | None = None,
    limit: int | None = None,
) -> AuditLogPage:
    """Cursor-paginated audit feed (M2). Pass the response's `next_cursor` back as `cursor`."""
    page = await list_audit(session, tenant_id, cursor=cursor, limit=limit)
    return AuditLogPage(
        items=[AuditLogOut.model_validate(a) for a in page.items],
        next_cursor=page.next_cursor,
        has_more=page.has_more,
    )


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
