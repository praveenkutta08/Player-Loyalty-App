"""In-memory mock LoyaltyPort."""

from __future__ import annotations

from ...ports.errors import AdapterRejectedError
from ...ports.loyalty import LoyaltyAccount, LoyaltyTransaction
from .base import MockAdapterBase


def _tier_for(points: int) -> str:
    if points >= 10_000:
        return "platinum"
    if points >= 2_500:
        return "gold"
    if points >= 500:
        return "silver"
    return "bronze"


class MockLoyaltyAdapter(MockAdapterBase):
    def _init_state(self) -> None:
        self._points: dict[str, int] = {}

    async def get_account(self, player_ref: str) -> LoyaltyAccount:
        await self._simulate()
        points = self._points.get(player_ref, 0)
        return LoyaltyAccount(player_ref=player_ref, points=points, tier=_tier_for(points))

    async def earn(self, player_ref: str, points: int, reason: str) -> LoyaltyTransaction:
        await self._simulate()
        if points <= 0:
            raise AdapterRejectedError("points must be positive", code="invalid_amount")
        balance = self._points.get(player_ref, 0) + points
        self._points[player_ref] = balance
        return LoyaltyTransaction(
            id=self._new_id(),
            player_ref=player_ref,
            points_delta=points,
            balance=balance,
            reason=reason,
        )

    async def redeem(self, player_ref: str, points: int, reason: str) -> LoyaltyTransaction:
        await self._simulate()
        if points <= 0:
            raise AdapterRejectedError("points must be positive", code="invalid_amount")
        current = self._points.get(player_ref, 0)
        if points > current:
            raise AdapterRejectedError("insufficient points", code="insufficient_points")
        balance = current - points
        self._points[player_ref] = balance
        return LoyaltyTransaction(
            id=self._new_id(),
            player_ref=player_ref,
            points_delta=-points,
            balance=balance,
            reason=reason,
        )
