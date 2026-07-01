"""Games catalog + player favorites (tenant-owned, RLS). CMS-managed content."""

from __future__ import annotations

import enum
import uuid

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import BaseModel, TenantOwnedMixin


class GameCategory(enum.StrEnum):
    slots = "slots"
    tables = "tables"


class GameStatus(enum.StrEnum):
    draft = "draft"
    published = "published"


class Game(TenantOwnedMixin, BaseModel):
    __tablename__ = "games"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    provider: Mapped[str | None] = mapped_column(String(120), nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    volatility: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_jackpot: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    jackpot_amount_cents: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=GameStatus.draft.value, server_default="draft"
    )
    featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")


class PlayerFavorite(TenantOwnedMixin, BaseModel):
    __tablename__ = "player_favorites"
    __table_args__ = (
        UniqueConstraint("tenant_id", "player_id", "game_id", name="uq_player_favorites_unique"),
    )

    player_id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), nullable=False, index=True)
    game_id: Mapped[uuid.UUID] = mapped_column(
        PgUUID(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False, index=True
    )
