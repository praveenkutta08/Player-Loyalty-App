"""Schemas for CMS content + media presign."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import ContentStatus, ContentType


class ContentItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    content_type: str
    title: str
    body: str | None
    media_url: str | None
    status: str
    publish_at: datetime | None
    segment: str | None


class ContentCreate(BaseModel):
    content_type: ContentType
    title: str
    body: str | None = None
    media_url: str | None = None
    segment: str | None = None
    publish_at: datetime | None = None


class ContentUpdate(BaseModel):
    content_type: ContentType | None = None
    title: str | None = None
    body: str | None = None
    media_url: str | None = None
    segment: str | None = None
    publish_at: datetime | None = None
    status: ContentStatus | None = None


class PresignRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"


class PresignResponse(BaseModel):
    key: str
    upload_url: str
    media_url: str
