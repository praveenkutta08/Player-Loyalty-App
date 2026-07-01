"""Schemas for the support assistant."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FaqOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    question: str
    answer: str
    is_active: bool


class FaqCreate(BaseModel):
    question: str
    answer: str
    is_active: bool = True


class ChatRequest(BaseModel):
    message: str
    session_id: UUID | None = None


class ChatResponse(BaseModel):
    session_id: UUID
    reply: str
    confidence: float
    escalate: bool
    refused: bool


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    role: str
    content: str
    confidence: float | None
    ts: datetime


class EscalateRequest(BaseModel):
    session_id: UUID
    subject: str | None = None


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID | None
    subject: str
    status: str
