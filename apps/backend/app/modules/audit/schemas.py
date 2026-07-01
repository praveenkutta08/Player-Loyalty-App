"""Schemas for audit + analytics read endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_type: str
    actor_id: UUID | None
    action: str
    entity: str
    entity_id: UUID | None
    meta: dict[str, Any] | None
    ts: datetime
