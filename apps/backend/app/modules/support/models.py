"""Support assistant: per-tenant FAQ knowledge, chat sessions/messages, escalation tickets."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class ChatRole(enum.StrEnum):
    user = "user"
    assistant = "assistant"


class SessionStatus(enum.StrEnum):
    open = "open"
    escalated = "escalated"
    closed = "closed"


class Faq(TenantOwnedMixin, BaseModel):
    __tablename__ = "support_faqs"

    question: Mapped[str] = mapped_column(String(500), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )


class ChatSession(TenantOwnedMixin, BaseModel):
    __tablename__ = "chat_sessions"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SessionStatus.open.value, server_default="open"
    )


class ChatMessage(TenantOwnedMixin, BaseModel):
    __tablename__ = "chat_messages"

    session_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class SupportTicket(TenantOwnedMixin, BaseModel):
    __tablename__ = "support_tickets"

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(PgUUID(as_uuid=True), nullable=True)
    subject: Mapped[str] = mapped_column(String(300), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open", server_default="open"
    )
