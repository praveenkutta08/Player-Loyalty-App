"""Support assistant services: FAQ knowledge, chat turns via ChatPort, escalation."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.chat import ChatPort, ChatReply, FaqEntry
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.models import Player
from .models import ChatMessage, ChatRole, ChatSession, Faq, SessionStatus, SupportTicket
from .schemas import FaqCreate


# ------------------------------------------------------------------ FAQ (admin)
async def create_faq(session: AsyncSession, tenant_id: UUID, data: FaqCreate) -> Faq:
    faq = Faq(tenant_id=tenant_id, **data.model_dump())
    session.add(faq)
    await session.flush()
    return faq


async def list_faqs(session: AsyncSession, tenant_id: UUID) -> list[Faq]:
    return list(
        (await session.execute(select(Faq).where(Faq.tenant_id == tenant_id))).scalars().all()
    )


async def _active_faqs(session: AsyncSession, tenant_id: UUID) -> list[FaqEntry]:
    rows = (
        (
            await session.execute(
                select(Faq).where(Faq.tenant_id == tenant_id, Faq.is_active.is_(True))
            )
        )
        .scalars()
        .all()
    )
    return [FaqEntry(question=r.question, answer=r.answer) for r in rows]


# ------------------------------------------------------------------ chat
async def _get_or_create_session(
    session: AsyncSession, player: Player, session_id: UUID | None
) -> ChatSession:
    if session_id is not None:
        chat = (
            await session.execute(
                select(ChatSession).where(
                    ChatSession.id == session_id, ChatSession.player_id == player.id
                )
            )
        ).scalar_one_or_none()
        if chat is None:
            raise ProblemException(404, "Chat session not found")
        return chat
    chat = ChatSession(tenant_id=player.tenant_id, player_id=player.id)
    session.add(chat)
    await session.flush()
    return chat


async def _add_message(
    session: AsyncSession,
    chat: ChatSession,
    role: ChatRole,
    content: str,
    confidence: float | None,
) -> None:
    session.add(
        ChatMessage(
            tenant_id=chat.tenant_id,
            session_id=chat.id,
            role=role.value,
            content=content,
            confidence=confidence,
            ts=datetime.now(UTC),
        )
    )
    await session.flush()


async def chat_turn(
    session: AsyncSession, port: ChatPort, player: Player, message: str, session_id: UUID | None
) -> tuple[ChatSession, ChatReply]:
    chat = await _get_or_create_session(session, player, session_id)
    await _add_message(session, chat, ChatRole.user, message, None)

    faqs = await _active_faqs(session, player.tenant_id)
    reply = await port.answer(message=message, faqs=faqs, history=[])

    await _add_message(session, chat, ChatRole.assistant, reply.text, reply.confidence)
    return chat, reply


async def history(session: AsyncSession, player: Player, session_id: UUID) -> list[ChatMessage]:
    return list(
        (
            await session.execute(
                select(ChatMessage)
                .where(
                    ChatMessage.tenant_id == player.tenant_id,
                    ChatMessage.session_id == session_id,
                )
                .order_by(ChatMessage.ts.asc())
            )
        )
        .scalars()
        .all()
    )


async def escalate(
    session: AsyncSession, player: Player, session_id: UUID, subject: str | None
) -> SupportTicket:
    chat = await _get_or_create_session(session, player, session_id)
    chat.status = SessionStatus.escalated.value
    ticket = SupportTicket(
        tenant_id=player.tenant_id,
        player_id=player.id,
        session_id=chat.id,
        subject=subject or "Support request",
        status="open",
    )
    session.add(ticket)
    await session.flush()
    # Conversations/escalations are audited (Responsible-Gaming + consent posture).
    await write_audit(
        session,
        tenant_id=player.tenant_id,
        actor_type=ActorType.player.value,
        actor_id=player.id,
        action="support:escalate",
        entity="support_ticket",
        entity_id=ticket.id,
    )
    return ticket
