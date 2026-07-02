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


@dataclass(frozen=True)
class PlayerValue:
    """Concierge value signals (P6.1) — worth band, theoretical, and visit cadence.

    Mock returns three stable personas; the real CMP adapter is a Phase-2 swap.
    """

    player_ref: str
    persona: str  # regional_commuter | weekend_destination | high_value_local
    worth_band: str  # low | mid | high
    adt_cents: int  # average daily theoretical
    visit_frequency_per_month: float
    recent_visit_gap_days: int


@runtime_checkable
class LoyaltyPort(Protocol):
    async def get_account(self, player_ref: str) -> LoyaltyAccount: ...

    async def earn(self, player_ref: str, points: int, reason: str) -> LoyaltyTransaction: ...

    async def redeem(self, player_ref: str, points: int, reason: str) -> LoyaltyTransaction: ...

    async def get_activity(self, player_ref: str, limit: int = 20) -> list[LoyaltyActivity]: ...

    async def get_player_value(self, player_ref: str) -> PlayerValue: ...
