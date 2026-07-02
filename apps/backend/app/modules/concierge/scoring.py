"""Deterministic concierge scoring (P6.2) — pure functions, no I/O, no clock reads.

The LLM (P6.3) narrates these numbers; it NEVER computes them. Every score ships with
machine-readable reasons so the UI can render "why you" chips with source attribution, and
missing inputs degrade explicitly (component skipped + flagged) instead of guessing.

``visit_fit = w1·value_at_risk + w2·weather_fit + w3·travel_fit + w4·tier_urgency`` (0–100)
``offer_score = relevance × urgency × feasibility_today``
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from app.ports.loyalty import PlayerValue
from app.ports.travel import TravelEstimate
from app.ports.weather import DailyForecast

# Source ids for UI chips — must match the tool registry's sources.
SOURCE_PLAYER = "player-mcp"
SOURCE_OFFERS = "offers-mcp"
SOURCE_WEATHER = "weather-mcp"
SOURCE_MAPS = "maps-mcp"

# Loyalty tier ladder (mirrors the LoyaltyPort mock; real CMP supplies its own in Phase 2).
TIER_THRESHOLDS: tuple[tuple[str, int], ...] = (
    ("bronze", 0),
    ("silver", 500),
    ("gold", 2_500),
    ("platinum", 10_000),
)

_WEATHER_FIT: dict[str, float] = {
    "clear": 1.0,
    "partly_cloudy": 0.9,
    "overcast": 0.7,
    "fog": 0.6,
    "rain": 0.35,
    "snow": 0.3,
    "storm": 0.1,
}

_WORTH_FACTOR = {"low": 0.6, "mid": 0.8, "high": 1.0}


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


@dataclass(frozen=True)
class ScoreWeights:
    """visit_fit component weights; tenant-tunable in Concierge Studio (P6.4)."""

    value_at_risk: float = 0.35
    weather_fit: float = 0.25
    travel_fit: float = 0.20
    tier_urgency: float = 0.20

    @classmethod
    def from_config(cls, raw: dict[str, Any] | None) -> ScoreWeights:
        """Build from a tenant-config dict; unknown keys ignored, bad values fall back."""
        if not raw:
            return cls()
        defaults = cls()
        values: dict[str, float] = {}
        for name in ("value_at_risk", "weather_fit", "travel_fit", "tier_urgency"):
            value = raw.get(name)
            if isinstance(value, int | float) and 0 <= float(value) <= 1:
                values[name] = float(value)
            else:
                values[name] = getattr(defaults, name)
        return cls(**values)


@dataclass(frozen=True)
class Reason:
    """One machine-readable scoring reason (rendered as a WhyYouPill / chip)."""

    code: str  # stable machine key, e.g. "value_at_risk_high"
    chip: str  # short UI text
    detail: str
    source: str  # tool source id for the SourceChip


@dataclass(frozen=True)
class TierProgress:
    tier: str
    points: int
    next_tier: str | None
    points_to_next: int | None


@dataclass(frozen=True)
class VisitFit:
    score: int  # 0–100
    confidence: str  # high | medium | low — how many components were available
    components: dict[str, float | None] = field(hash=False)
    reasons: tuple[Reason, ...] = ()


def tier_progress(points: int) -> TierProgress:
    current = TIER_THRESHOLDS[0][0]
    next_tier: str | None = None
    points_to_next: int | None = None
    for index, (tier, threshold) in enumerate(TIER_THRESHOLDS):
        if points >= threshold:
            current = tier
            if index + 1 < len(TIER_THRESHOLDS):
                next_name, next_threshold = TIER_THRESHOLDS[index + 1]
                next_tier = next_name
                points_to_next = next_threshold - points
            else:
                next_tier = None
                points_to_next = None
    return TierProgress(
        tier=current, points=points, next_tier=next_tier, points_to_next=points_to_next
    )


# ------------------------------------------------------------------ visit_fit components
def value_at_risk_component(value: PlayerValue) -> float:
    """How overdue is this player vs their own cadence (churn-risk energy)."""
    expected_gap_days = 30.0 / max(value.visit_frequency_per_month, 0.25)
    overdue_ratio = value.recent_visit_gap_days / expected_gap_days
    # 0.5× expected gap → 0; 2× expected gap → 1.
    base = _clamp01((overdue_ratio - 0.5) / 1.5)
    return _clamp01(base * _WORTH_FACTOR.get(value.worth_band, 0.8))


def weather_fit_component(day: DailyForecast) -> float:
    fit = _WEATHER_FIT.get(day.condition, 0.5)
    if day.wind_kph > 40:
        fit -= 0.1
    return _clamp01(fit)


def travel_fit_component(estimate: TravelEstimate) -> float:
    # 0 min → 1.0, 180+ min → 0; light traffic vs typical earns a bonus.
    base = _clamp01(1.0 - estimate.duration_min / 180.0)
    if estimate.duration_min < estimate.typical_duration_min:
        base += 0.15
    return _clamp01(base)


def tier_urgency_component(progress: TierProgress) -> float:
    if progress.next_tier is None or progress.points_to_next is None:
        return 0.2  # already at the top — mild retention pull only
    thresholds = dict(TIER_THRESHOLDS)
    band = thresholds[progress.next_tier] - thresholds[progress.tier]
    return _clamp01(1.0 - progress.points_to_next / band)


def visit_fit(
    *,
    value: PlayerValue | None,
    weather_day: DailyForecast | None,
    travel: TravelEstimate | None,
    progress: TierProgress | None,
    weights: ScoreWeights | None = None,
) -> VisitFit:
    """Compose the 0–100 visit-fit score; absent inputs degrade (skipped + flagged)."""
    w = weights or ScoreWeights()
    components: dict[str, float | None] = {
        "value_at_risk": value_at_risk_component(value) if value else None,
        "weather_fit": weather_fit_component(weather_day) if weather_day else None,
        "travel_fit": travel_fit_component(travel) if travel else None,
        "tier_urgency": tier_urgency_component(progress) if progress else None,
    }
    weight_by_name = {
        "value_at_risk": w.value_at_risk,
        "weather_fit": w.weather_fit,
        "travel_fit": w.travel_fit,
        "tier_urgency": w.tier_urgency,
    }
    present = {k: v for k, v in components.items() if v is not None}
    total_weight = sum(weight_by_name[k] for k in present)
    score = (
        round(100 * sum(weight_by_name[k] * v for k, v in present.items()) / total_weight)
        if total_weight > 0
        else 0
    )
    confidence = "high" if len(present) >= 3 else ("medium" if len(present) == 2 else "low")

    reasons: list[Reason] = []
    if value is not None and (component := components["value_at_risk"]) and component >= 0.5:
        reasons.append(
            Reason(
                code="value_at_risk_high",
                chip=f"{value.recent_visit_gap_days} days since your last visit",
                detail=(
                    f"You usually visit {value.visit_frequency_per_month:g}×/month — "
                    "you're overdue."
                ),
                source=SOURCE_PLAYER,
            )
        )
    if weather_day is not None:
        good = (components["weather_fit"] or 0) >= 0.7
        reasons.append(
            Reason(
                code="weather_good" if good else "weather_poor",
                chip=(
                    f"{weather_day.condition.replace('_', ' ').title()}, "
                    f"{round(weather_day.temp_high_c)}°C"
                ),
                detail=f"Precipitation chance {weather_day.precipitation_chance}%.",
                source=SOURCE_WEATHER,
            )
        )
    if travel is not None:
        delta = round(travel.typical_duration_min - travel.duration_min)
        if delta > 0:
            reasons.append(
                Reason(
                    code="traffic_light",
                    chip=f"Drive is {delta} min faster than usual",
                    detail=f"{round(travel.duration_min)} min now vs "
                    f"{round(travel.typical_duration_min)} min typically.",
                    source=SOURCE_MAPS,
                )
            )
    else:
        reasons.append(
            Reason(
                code="travel_fit_missing",
                chip="Add your home location for drive-time insight",
                detail="No stored origin (or no concierge consent) — travel fit was skipped.",
                source=SOURCE_MAPS,
            )
        )
    if (
        progress is not None
        and progress.points_to_next is not None
        and (components["tier_urgency"] or 0) >= 0.5
    ):
        reasons.append(
            Reason(
                code="tier_close",
                chip=f"{progress.points_to_next} pts to {progress.next_tier}",
                detail=f"You're {progress.points} pts into {progress.tier}.",
                source=SOURCE_PLAYER,
            )
        )
    return VisitFit(
        score=score, confidence=confidence, components=components, reasons=tuple(reasons)
    )


# ------------------------------------------------------------------ offer ranking
@dataclass(frozen=True)
class RankedOffer:
    offer_id: str
    title: str
    kind: str
    score: float
    rank: int
    why_you: tuple[Reason, ...]


def _urgency(end_at: datetime | None, now: datetime) -> float:
    if end_at is None:
        return 0.5
    days_left = (end_at - now).total_seconds() / 86_400
    if days_left <= 1:
        return 1.0
    if days_left <= 3:
        return 0.85
    if days_left <= 7:
        return 0.7
    return 0.55


def rank_offers(
    offers: list[dict[str, Any]],
    *,
    segment: str | None,
    now: datetime,
    weather_condition: str | None = None,
    limit: int = 10,
) -> list[RankedOffer]:
    """Rank offer dicts (id/title/kind/segment/end_at) — deterministic, stable ties.

    ``offer_score = relevance × urgency × feasibility_today``. Sort is stable across input
    permutations: score desc, sooner expiry first (None last), then title, then id.
    """
    scored: list[tuple[float, datetime | None, str, str, RankedOffer]] = []
    for offer in offers:
        offer_segment = offer.get("segment")
        exact = segment is not None and offer_segment == segment
        relevance = 1.0 if exact else 0.7
        end_at: datetime | None = offer.get("end_at")
        urgency = _urgency(end_at, now)
        # The venue is indoors — bad weather barely dents feasibility; unknown = neutral.
        feasibility = 0.9 if weather_condition in {"rain", "storm", "snow"} else 1.0
        score = round(relevance * urgency * feasibility, 4)

        why: list[Reason] = []
        if exact:
            why.append(
                Reason(
                    code="segment_match",
                    chip=f"Picked for {segment} members",
                    detail=f"This {offer.get('kind', 'offer')} targets your segment.",
                    source=SOURCE_OFFERS,
                )
            )
        else:
            why.append(
                Reason(
                    code="broad_offer",
                    chip="Available to you",
                    detail="Open to all members.",
                    source=SOURCE_OFFERS,
                )
            )
        if end_at is not None and (end_at - now).total_seconds() <= 3 * 86_400:
            why.append(
                Reason(
                    code="expiring_soon",
                    chip="Expiring soon",
                    detail=f"Ends {end_at.date().isoformat()}.",
                    source=SOURCE_OFFERS,
                )
            )
        scored.append(
            (
                score,
                end_at,
                str(offer.get("title", "")),
                str(offer.get("id", "")),
                RankedOffer(
                    offer_id=str(offer.get("id", "")),
                    title=str(offer.get("title", "")),
                    kind=str(offer.get("kind", "offer")),
                    score=score,
                    rank=0,
                    why_you=tuple(why),
                ),
            )
        )

    def sort_key(
        item: tuple[float, datetime | None, str, str, RankedOffer],
    ) -> tuple[float, str, str, str]:
        score, end_at, title, offer_id, _ = item
        end_key = end_at.isoformat() if end_at is not None else "9999"
        return (-score, end_key, title, offer_id)

    ordered = sorted(scored, key=sort_key)[: max(1, limit)]
    return [
        RankedOffer(
            offer_id=r.offer_id,
            title=r.title,
            kind=r.kind,
            score=r.score,
            rank=index + 1,
            why_you=r.why_you,
        )
        for index, (_, _, _, _, r) in enumerate(ordered)
    ]
