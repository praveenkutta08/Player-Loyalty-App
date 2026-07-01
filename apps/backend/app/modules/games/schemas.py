"""Schemas for games catalog, favorites, and leaderboard."""

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict

from .models import GameCategory, GameStatus


class GameOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    category: str
    provider: str | None
    thumbnail_url: str | None
    volatility: str | None
    is_jackpot: bool
    jackpot_amount_cents: int | None
    status: str
    featured: bool
    sort_order: int


class GameCreate(BaseModel):
    title: str
    category: GameCategory
    provider: str | None = None
    thumbnail_url: str | None = None
    volatility: str | None = None
    is_jackpot: bool = False
    jackpot_amount_cents: int | None = None
    featured: bool = False
    sort_order: int = 0


class GameUpdate(BaseModel):
    title: str | None = None
    category: GameCategory | None = None
    provider: str | None = None
    thumbnail_url: str | None = None
    volatility: str | None = None
    is_jackpot: bool | None = None
    jackpot_amount_cents: int | None = None
    status: GameStatus | None = None
    featured: bool | None = None
    sort_order: int | None = None


class LeaderboardEntry(BaseModel):
    player_id: UUID
    points: int
    rank: int


class LeaderboardOut(BaseModel):
    entries: list[LeaderboardEntry]
    me: LeaderboardEntry | None
