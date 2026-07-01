"""CMS content items (tenant-owned, RLS-enforced)."""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class ContentType(enum.StrEnum):
    banner = "banner"
    article = "article"
    promo_card = "promo_card"
    announcement = "announcement"


class ContentStatus(enum.StrEnum):
    draft = "draft"
    published = "published"
    archived = "archived"


class ContentItem(TenantOwnedMixin, BaseModel):
    __tablename__ = "content_items"

    content_type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=ContentStatus.draft.value, server_default="draft"
    )
    publish_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    segment: Mapped[str | None] = mapped_column(String(100), nullable=True)
