"""Scoring is pure and deterministic (P6.2): stable ranking, explicit degradation, tunable
weights. No I/O anywhere in these tests — everything is constructed values."""

from __future__ import annotations

from datetime import UTC, datetime

from app.modules.concierge.scoring import (
    ScoreWeights,
    rank_offers,
    tier_progress,
    visit_fit,
)
from app.ports.loyalty import PlayerValue
from app.ports.travel import GeoPoint, TravelEstimate
from app.ports.weather import DailyForecast

NOW = datetime(2026, 7, 2, 12, 0, tzinfo=UTC)


def _value(gap: int = 12, freq: float = 3.0, band: str = "high") -> PlayerValue:
    return PlayerValue(
        player_ref="p1",
        persona="high_value_local",
        worth_band=band,
        adt_cents=90_000,
        visit_frequency_per_month=freq,
        recent_visit_gap_days=gap,
    )


def _weather(condition: str = "clear") -> DailyForecast:
    return DailyForecast(
        day=NOW.date(),
        condition=condition,
        temp_high_c=31.0,
        temp_low_c=22.0,
        precipitation_chance=5,
        wind_kph=10.0,
    )


def _travel(duration: float = 40.0, typical: float = 52.0) -> TravelEstimate:
    return TravelEstimate(
        origin=GeoPoint(36.0, -115.0),
        dest=GeoPoint(36.1, -115.2),
        distance_km=30.0,
        duration_min=duration,
        typical_duration_min=typical,
        depart_at=NOW,
        source="mock",
    )


def test_visit_fit_is_deterministic_and_bounded() -> None:
    first = visit_fit(
        value=_value(), weather_day=_weather(), travel=_travel(), progress=tier_progress(2_000)
    )
    second = visit_fit(
        value=_value(), weather_day=_weather(), travel=_travel(), progress=tier_progress(2_000)
    )
    assert first == second
    assert 0 <= first.score <= 100
    assert first.confidence == "high"
    assert all(v is None or 0 <= v <= 1 for v in first.components.values())


def test_visit_fit_degrades_without_travel() -> None:
    full = visit_fit(
        value=_value(), weather_day=_weather(), travel=_travel(), progress=tier_progress(2_000)
    )
    degraded = visit_fit(
        value=_value(), weather_day=_weather(), travel=None, progress=tier_progress(2_000)
    )
    assert degraded.components["travel_fit"] is None
    assert any(r.code == "travel_fit_missing" for r in degraded.reasons)
    assert not any(r.code == "travel_fit_missing" for r in full.reasons)
    assert 0 <= degraded.score <= 100  # weights renormalize; still a valid score


def test_visit_fit_confidence_drops_with_missing_inputs() -> None:
    low = visit_fit(value=_value(), weather_day=None, travel=None, progress=None)
    assert low.confidence == "low"
    medium = visit_fit(
        value=_value(), weather_day=_weather(), travel=None, progress=None
    )
    assert medium.confidence == "medium"


def test_weather_drives_score_direction() -> None:
    sunny = visit_fit(
        value=_value(), weather_day=_weather("clear"), travel=None, progress=None
    )
    stormy = visit_fit(
        value=_value(), weather_day=_weather("storm"), travel=None, progress=None
    )
    assert sunny.score > stormy.score


def test_weights_come_from_tenant_config() -> None:
    weather_only = ScoreWeights.from_config(
        {"value_at_risk": 0.0, "weather_fit": 1.0, "travel_fit": 0.0, "tier_urgency": 0.0}
    )
    result = visit_fit(
        value=_value(),
        weather_day=_weather("clear"),
        travel=None,
        progress=None,
        weights=weather_only,
    )
    assert result.score == 100  # clear-sky component is 1.0 and carries all the weight
    # Bad/missing values fall back to defaults; unknown keys are ignored.
    assert ScoreWeights.from_config({"weather_fit": 5, "bogus": 1}) == ScoreWeights()
    assert ScoreWeights.from_config(None) == ScoreWeights()


def test_tier_progress_ladder() -> None:
    assert tier_progress(0).tier == "bronze"
    mid = tier_progress(2_000)
    assert (mid.tier, mid.next_tier, mid.points_to_next) == ("silver", "gold", 500)
    top = tier_progress(20_000)
    assert (top.tier, top.next_tier, top.points_to_next) == ("platinum", None, None)


def test_rank_offers_orders_and_explains() -> None:
    offers = [
        {"id": "b", "title": "Broad evergreen", "kind": "offer", "segment": None, "end_at": None},
        {
            "id": "e",
            "title": "Expiring VIP",
            "kind": "offer",
            "segment": "vip",
            "end_at": NOW.replace(hour=23),
        },
        {"id": "v", "title": "VIP evergreen", "kind": "offer", "segment": "vip", "end_at": None},
    ]
    ranked = rank_offers(offers, segment="vip", now=NOW)
    assert [r.offer_id for r in ranked] == ["e", "v", "b"]  # match+expiring > match > broad
    assert ranked[0].rank == 1
    codes = {r.code for r in ranked[0].why_you}
    assert {"segment_match", "expiring_soon"} <= codes
    assert any(r.code == "broad_offer" for r in ranked[2].why_you)
    assert all(why.source == "offers-mcp" for r in ranked for why in r.why_you)


def test_rank_offers_is_stable_across_input_permutations() -> None:
    offers = [
        {"id": f"o{i}", "title": f"Offer {i}", "kind": "offer", "segment": None, "end_at": None}
        for i in range(6)
    ]
    forward = rank_offers(offers, segment=None, now=NOW)
    backward = rank_offers(list(reversed(offers)), segment=None, now=NOW)
    assert [r.offer_id for r in forward] == [r.offer_id for r in backward]


def test_rank_offers_respects_limit_and_weather_feasibility() -> None:
    offers = [
        {"id": f"o{i}", "title": f"Offer {i}", "kind": "offer", "segment": None, "end_at": None}
        for i in range(12)
    ]
    assert len(rank_offers(offers, segment=None, now=NOW, limit=5)) == 5
    clear = rank_offers(offers[:1], segment=None, now=NOW, weather_condition="clear")
    storm = rank_offers(offers[:1], segment=None, now=NOW, weather_condition="storm")
    assert storm[0].score < clear[0].score  # indoor venue: dented, not zeroed
    assert storm[0].score >= clear[0].score * 0.85
