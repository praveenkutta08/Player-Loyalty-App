"""LoyaltyPort — the casino loyalty/rewards system (points + tier)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class LoyaltyAccount:
    player_ref: str
    points: int
    tier: str


@dataclass(frozen=True)
class LoyaltyTransaction:
    id: str
    player_ref: str
    points_delta: int
    balance: int
    reason: str


@dataclass(frozen=True)
class LoyaltyActivity:
    id: str
    type: str  # win | loss | earn | redeem
    description: str
    points: int
    amount_cents: int
    at: datetime


@runtime_checkable
class LoyaltyPort(Protocol):
    async def get_account(self, player_ref: str) -> LoyaltyAccount: ...

    async def earn(self, player_ref: str, points: int, reason: str) -> LoyaltyTransaction: ...

    async def redeem(self, player_ref: str, points: int, reason: str) -> LoyaltyTransaction: ...

    async def get_activity(self, player_ref: str, limit: int = 20) -> list[LoyaltyActivity]: ...
