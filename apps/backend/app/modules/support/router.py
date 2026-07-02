"""Support endpoints: admin FAQ management (content:*) + player chat/history/escalate."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_chat_port
from ...db.session import get_session
from ...ports.chat import ChatPort
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import (
    ChatRequest,
    ChatResponse,
    EscalateRequest,
    FaqCreate,
    FaqOut,
    MessageOut,
    TicketOut,
)
from .service import chat_turn, create_faq, escalate, history, list_faqs

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
ChatDep = Annotated[ChatPort, Depends(get_chat_port)]


# ------------------------------------------------------------------ admin FAQ
@router.get(
    "/support/faq",
    response_model=list[FaqOut],
    tags=["support"],
    dependencies=[Depends(require(Permission.content_read.value))],
)
async def admin_list_faq(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[FaqOut]:
    return [FaqOut.model_validate(f) for f in await list_faqs(session, tenant_id)]


@router.post(
    "/support/faq",
    response_model=FaqOut,
    status_code=status.HTTP_201_CREATED,
    tags=["support"],
)
async def admin_create_faq(
    body: FaqCreate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_create.value))],
) -> FaqOut:
    faq = await create_faq(session, tenant_id, body)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="faq:create",
        entity="faq",
        entity_id=faq.id,
    )
    return FaqOut.model_validate(faq)


# ------------------------------------------------------------------ player chat
@router.post("/support/chat", response_model=ChatResponse, tags=["support"])
async def support_chat(
    body: ChatRequest, player: PlayerDep, session: SessionDep, port: ChatDep
) -> ChatResponse:
    # audit: exempt — conversational support turn; the full transcript persists in
    # support_messages, and escalation (the privileged transition) is audited in the service.
    chat, reply = await chat_turn(session, port, player, body.message, body.session_id)
    return ChatResponse(
        session_id=chat.id,
        reply=reply.text,
        confidence=reply.confidence,
        escalate=reply.escalate,
        refused=reply.refused,
    )


@router.get("/support/history", response_model=list[MessageOut], tags=["support"])
async def support_history(
    session_id: UUID, player: PlayerDep, session: SessionDep
) -> list[MessageOut]:
    return [MessageOut.model_validate(m) for m in await history(session, player, session_id)]


@router.post("/support/escalate", response_model=TicketOut, tags=["support"])
async def support_escalate(
    body: EscalateRequest, player: PlayerDep, session: SessionDep
) -> TicketOut:
    # audit: exempt — escalate() writes the audit row in the service layer.
    ticket = await escalate(session, player, body.session_id, body.subject)
    return TicketOut.model_validate(ticket)
