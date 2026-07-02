"""In-memory mock LoyaltyPort."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from ...ports.errors import AdapterRejectedError
from ...ports.loyalty import LoyaltyAccount, LoyaltyActivity, LoyaltyTransaction, PlayerValue
from .base import MockAdapterBase


def _tier_for(points: int) -> str:
    if points >= 10_000:
        return "platinum"
    if points >= 2_500:
        return "gold"
    if points >= 500:
        return "silver"
    return "bronze"


# The three demo personas (P6.1). A player maps to one deterministically by ref, so the same
# player always scores the same way and the seed can pin specific players to specific personas.
_PERSONAS = (
    PlayerValue(
        player_ref="",
        persona="regional_commuter",
        worth_band="mid",
        adt_cents=180_00,
        visit_frequency_per_month=3.0,
        recent_visit_gap_days=6,
    ),
    PlayerValue(
        player_ref="",
        persona="weekend_destination",
        worth_band="mid",
        adt_cents=320_00,
        visit_frequency_per_month=1.0,
        recent_visit_gap_days=19,
    ),
    PlayerValue(
        player_ref="",
        persona="high_value_local",
        worth_band="high",
        adt_cents=940_00,
        visit_frequency_per_month=6.5,
        recent_visit_gap_days=11,
    ),
)


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

    async def get_player_value(self, player_ref: str) -> PlayerValue:
        await self._simulate()
        template = _PERSONAS[sum(player_ref.encode()) % len(_PERSONAS)]
        return PlayerValue(
            player_ref=player_ref,
            persona=template.persona,
            worth_band=template.worth_band,
            adt_cents=template.adt_cents,
            visit_frequency_per_month=template.visit_frequency_per_month,
            recent_visit_gap_days=template.recent_visit_gap_days,
        )

    async def get_activity(self, player_ref: str, limit: int = 20) -> list[LoyaltyActivity]:
        await self._simulate()
        now = datetime.now(UTC)
        sample = [
            LoyaltyActivity(
                id=self._new_id(),
                type="win",
                description="Slots — Golden Dragon",
                points=120,
                amount_cents=4500,
                at=now - timedelta(hours=2),
            ),
            LoyaltyActivity(
                id=self._new_id(),
                type="loss",
                description="Blackjack table 7",
                points=0,
                amount_cents=-2000,
                at=now - timedelta(hours=5),
            ),
            LoyaltyActivity(
                id=self._new_id(),
                type="earn",
                description="Daily check-in bonus",
                points=50,
                amount_cents=0,
                at=now - timedelta(days=1),
            ),
        ]
        return sample[:limit]
