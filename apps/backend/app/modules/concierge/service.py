"""Concierge configuration + the answer orchestrator (P6.2/P6.3).

Orchestrator flow per use case: plan tools → call (ports in parallel, DB tools sequentially on
the shared session) → score deterministically → LLM narrates → uniform envelope. Guardrails run
FIRST: RG-flagged players get a neutral brief (no visit nudges), quiet hours / frequency caps
suppress proactive CTAs, and every answer writes an append-only ``concierge_answers`` row.
Answers cache ~5 min per (player, use_case, context_hash).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cache
from app.core.settings import get_settings
from app.ports.errors import AdapterError
from app.ports.llm import LlmMessage, LlmPort
from app.ports.loyalty import PlayerValue
from app.ports.travel import GeoPoint, TravelEstimate

from ..players.models import Player
from ..tenant_config.service import get_config
from .models import ConciergeAnswer, Property
from .prompts import DISCLAIMER, SYSTEM_PROMPTS, TEMPERATURES
from .scoring import ScoreWeights, TierProgress, visit_fit
from .tools import TOOLS, ToolContext, ToolResult, call_tool

# Default persona/guardrails; tenants override via Concierge Studio (P6.4). "Aria" is only the
# seed default — persona is manifest/tenant config, never hardcoded in the app (golden rule #5).
DEFAULT_CONCIERGE_CONFIG: dict[str, Any] = {
    "persona": {"name": "Aria", "tone": "warm", "accent_token": "gold"},
    "weights": {
        "value_at_risk": 0.35,
        "weather_fit": 0.25,
        "travel_fit": 0.20,
        "tier_urgency": 0.20,
    },
    "guardrails": {"quiet_hours_start": 22, "quiet_hours_end": 8, "frequency_cap_per_day": 3},
}


async def get_concierge_config(session: AsyncSession, tenant_id: UUID) -> dict[str, Any]:
    """Tenant concierge config with defaults deep-filled for missing sections."""
    config = await get_config(session, tenant_id)
    stored: dict[str, Any] = dict(config.concierge or {}) if config else {}
    merged = {
        key: {**default, **stored.get(key, {})}
        for key, default in DEFAULT_CONCIERGE_CONFIG.items()
    }
    return merged


async def get_weights(session: AsyncSession, tenant_id: UUID) -> ScoreWeights:
    config = await get_concierge_config(session, tenant_id)
    return ScoreWeights.from_config(config.get("weights"))


# ====================================================================== guardrails (P6.3)
def rg_restriction(player: Player) -> str | None:
    """Return the active responsible-gaming restriction, if any.

    Self-exclusion, an unexpired cool-off, or any set limit means NO proactive visit nudges —
    the player still gets service content, never gambling encouragement.
    """
    flags = player.rg_flags or {}
    if flags.get("self_exclusion"):
        return "self_exclusion"
    cool_off = flags.get("cool_off_until")
    if isinstance(cool_off, str):
        try:
            if datetime.fromisoformat(cool_off) > datetime.now(UTC):
                return "cool_off"
        except ValueError:
            return "cool_off"  # unparseable → fail safe, treat as active
    if flags.get("limits"):
        return "limits"
    return None


def _in_quiet_hours(now: datetime, start: int | None, end: int | None) -> bool:
    if start is None or end is None or start == end:
        return False
    hour = now.hour
    if start < end:
        return start <= hour < end
    return hour >= start or hour < end  # overnight window


async def _proactive_count_today(session: AsyncSession, player: Player, now: datetime) -> int:
    since = now - timedelta(days=1)
    return (
        await session.execute(
            select(func.count())
            .select_from(ConciergeAnswer)
            .where(
                ConciergeAnswer.player_id == player.id,
                ConciergeAnswer.use_case == "brief",
                ConciergeAnswer.created_at >= since,
            )
        )
    ).scalar_one()


# ====================================================================== orchestrator
_TOOL_PLANS: dict[str, list[str]] = {
    "brief": [
        "get_player_value",
        "get_tier_progress",
        "list_nearby_properties",
        "weather.get_forecast",
        "maps.get_travel_time",
        "list_offers",
    ],
    "offers": ["get_player_value", "weather.get_forecast", "list_nearby_properties", "list_offers"],
    "plan": [
        "get_preferences",
        "list_nearby_properties",
        "weather.get_forecast",
        "maps.get_travel_time",
        "list_offers",
        "list_trip_history",
    ],
    "ask": [
        "get_player_value",
        "get_tier_progress",
        "list_nearby_properties",
        "weather.get_forecast",
        "maps.get_travel_time",
        "list_offers",
    ],
}


def _context_hash(player: Player, use_case: str, params: dict[str, Any], now: datetime) -> str:
    payload = json.dumps(
        {
            "player": str(player.id),
            "use_case": use_case,
            "params": params,
            # Bucket to the hour so the hash (and therefore the cache key) rolls over hourly
            # even if the 5-min TTL were raised.
            "hour": now.strftime("%Y-%m-%dT%H"),
            "consent": player.concierge_consent,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


async def _primary_property(session: AsyncSession) -> Property | None:
    return (
        (
            await session.execute(
                select(Property)
                .where(Property.status == "active")
                .order_by(Property.created_at, Property.name)
                .limit(1)
            )
        )
        .scalars()
        .first()
    )


async def _run_tools(
    ctx: ToolContext, plan: list[str], args_by_tool: dict[str, dict[str, Any]]
) -> dict[str, ToolResult]:
    """DB-backed tools run sequentially on the shared session; port tools gather in parallel."""
    db_tools = [name for name in plan if TOOLS[name].uses_db]
    port_tools = [name for name in plan if not TOOLS[name].uses_db]
    results: dict[str, ToolResult] = {}
    for name in db_tools:
        results[name] = await call_tool(name, ctx, args_by_tool.get(name))
    parallel = await asyncio.gather(
        *(call_tool(name, ctx, args_by_tool.get(name)) for name in port_tools)
    )
    results.update(dict(zip(port_tools, parallel, strict=True)))
    return results


def _parse_value(result: ToolResult | None) -> PlayerValue | None:
    if result is None or not result.ok:
        return None
    return PlayerValue(**result.data)


def _parse_progress(result: ToolResult | None) -> TierProgress | None:
    if result is None or not result.ok:
        return None
    return TierProgress(**result.data)


def _parse_travel(result: ToolResult | None) -> TravelEstimate | None:
    if result is None or not result.ok:
        return None
    data = dict(result.data)
    return TravelEstimate(
        origin=GeoPoint(**data["origin"]),
        dest=GeoPoint(**data["dest"]),
        distance_km=data["distance_km"],
        duration_min=data["duration_min"],
        typical_duration_min=data["typical_duration_min"],
        depart_at=datetime.fromisoformat(data["depart_at"]),
        source=data["source"],
    )


def _weather_today(result: ToolResult | None) -> dict[str, Any] | None:
    if result is None or not result.ok or not result.data.get("days"):
        return None
    first: dict[str, Any] = result.data["days"][0]
    return first


def _signals(
    weather_day: dict[str, Any] | None, travel: TravelEstimate | None, progress: TierProgress | None
) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []
    if weather_day is not None:
        signals.append(
            {
                "label": "Weather",
                "value": (
                    f"{weather_day['condition'].replace('_', ' ').title()} "
                    f"{round(weather_day['temp_high_c'])}°C"
                ),
                "delta": None,
                "source": "weather-mcp",
            }
        )
    if travel is not None:
        delta_min = round(travel.typical_duration_min - travel.duration_min)
        signals.append(
            {
                "label": "Drive",
                "value": f"{round(travel.duration_min)} min",
                "delta": f"{-delta_min:+d} vs usual" if delta_min else None,
                "source": "maps-mcp",
            }
        )
    if progress is not None and progress.points_to_next is not None:
        signals.append(
            {
                "label": "Tier",
                "value": f"{progress.points_to_next} pts to {progress.next_tier}",
                "delta": None,
                "source": "player-mcp",
            }
        )
    return signals


async def _narrate(
    llm: LlmPort, use_case: str, context: dict[str, Any], fallback: str
) -> str:
    """LLM narrates the structured context; on failure fall back to a deterministic verdict."""
    try:
        completion = await llm.complete(
            system=SYSTEM_PROMPTS[use_case],
            messages=[LlmMessage(role="user", content=json.dumps(context, default=str))],
            temperature=TEMPERATURES[use_case],
        )
        return completion.text
    except AdapterError:
        return fallback


async def run_use_case(
    session: AsyncSession,
    player: Player,
    llm: LlmPort,
    ctx: ToolContext,
    use_case: str,
    *,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Answer one use case end-to-end; returns the envelope as a plain dict (cache-friendly)."""
    params = params or {}
    now = datetime.now(UTC)
    settings = get_settings()
    config = await get_concierge_config(session, player.tenant_id)
    weights = ScoreWeights.from_config(config.get("weights"))
    guardrails = config.get("guardrails", {})

    # Answer cache: (player, use_case, context_hash), ~5 min.
    inputs_hash = _context_hash(player, use_case, params, now)
    cache = get_cache()
    cache_key = f"concierge:answer:{player.tenant_id}:{player.id}:{use_case}:{inputs_hash}"
    if (cached := await cache.get(cache_key)) is not None:
        return dict(json.loads(cached))

    # GUARDRAIL 1 — responsible gaming: restricted players get a NEUTRAL answer. No fit score,
    # no visit nudge, no urgency; service content only.
    restriction = rg_restriction(player)

    # GUARDRAIL 2 — proactive-nudge suppression (brief only): quiet hours + frequency cap.
    suppressed: str | None = None
    if use_case == "brief" and restriction is None:
        if _in_quiet_hours(
            now, guardrails.get("quiet_hours_start"), guardrails.get("quiet_hours_end")
        ):
            suppressed = "quiet_hours"
        else:
            cap = guardrails.get("frequency_cap_per_day")
            if (
                isinstance(cap, int)
                and cap >= 0
                and await _proactive_count_today(session, player, now) >= cap
            ):
                suppressed = "frequency_capped"

    persona = config.get("persona", {})
    tool_results: dict[str, ToolResult] = {}
    envelope: dict[str, Any]

    if restriction is not None:
        envelope = {
            "use_case": use_case,
            "verdict": "Here's what's happening at the resort — dining, shows, and your "
            "reservations are all in the app.",
            "fit_score": None,
            "confidence": "high",
            "reasons": [],
            "signals": [],
            "sources": [],
            "degraded": [],
            "cta": None,
            "disclaimer": DISCLAIMER,
            "generated_at": now.isoformat(),
            "cache_ttl_s": settings.concierge_answer_cache_ttl_s,
        }
        scores: dict[str, Any] = {"rg_neutral": restriction}
    else:
        # Plan → call tools. Weather/travel target the tenant's primary property.
        plan = list(_TOOL_PLANS[use_case])
        prop = await _primary_property(session)
        args_by_tool: dict[str, dict[str, Any]] = {"list_offers": {"limit": 10}}
        if prop is not None:
            args_by_tool["weather.get_forecast"] = {"lat": prop.lat, "lng": prop.lng, "days": 3}
            args_by_tool["maps.get_travel_time"] = {"dest_lat": prop.lat, "dest_lng": prop.lng}
        else:
            plan = [t for t in plan if t not in ("weather.get_forecast", "maps.get_travel_time")]
        tool_results = await _run_tools(ctx, plan, args_by_tool)

        value = _parse_value(tool_results.get("get_player_value"))
        progress = _parse_progress(tool_results.get("get_tier_progress"))
        travel = _parse_travel(tool_results.get("maps.get_travel_time"))
        weather_day = _weather_today(tool_results.get("weather.get_forecast"))
        weather_df = None
        if weather_day is not None:
            from datetime import date as _date

            from app.ports.weather import DailyForecast

            weather_df = DailyForecast(
                day=_date.fromisoformat(weather_day["day"]),
                condition=weather_day["condition"],
                temp_high_c=weather_day["temp_high_c"],
                temp_low_c=weather_day["temp_low_c"],
                precipitation_chance=weather_day["precipitation_chance"],
                wind_kph=weather_day["wind_kph"],
            )

        fit = visit_fit(
            value=value,
            weather_day=weather_df,
            travel=travel,
            progress=progress,
            weights=weights,
        )
        offers_result = tool_results.get("list_offers")
        offer_items: list[dict[str, Any]] = (
            list(offers_result.data.get("items", [])) if offers_result and offers_result.ok else []
        )
        degraded = [name for name, result in tool_results.items() if not result.ok]
        sources = sorted(
            {result.source for result in tool_results.values() if result.ok}
        )

        # Reasons: scoring chips + the top offer's strongest why_you.
        reasons = [
            {"code": r.code, "chip": r.chip, "detail": r.detail, "source": r.source}
            for r in fit.reasons
        ]
        if offer_items:
            reasons.extend(offer_items[0]["why_you"][:1])

        narration_context = {
            "use_case": use_case,
            "tenant_name": prop.name if prop else "the resort",
            "persona_name": persona.get("name", "Concierge"),
            "fit_score": None if suppressed else fit.score,
            "chips": [r["chip"] for r in reasons[:4]],
            "degraded": degraded,
            "offer_titles": [o["title"] for o in offer_items[:3]],
            "question": params.get("question"),
            "headline": "here's what I found.",
            "leave_time": params.get("leave_time"),
            "stops": params.get("stops", []),
        }
        fallback_verdict = (
            f"Visit fit {fit.score}/100 — " + "; ".join(narration_context["chips"][:2])
            if not suppressed
            else "Here's what's on at the resort."
        )
        verdict = await _narrate(llm, use_case, narration_context, fallback_verdict)

        cta: dict[str, Any] | None = None
        if use_case == "brief" and not suppressed:
            cta = {"label": "Plan my visit", "action": "concierge.plan"}
        elif use_case == "offers":
            cta = {"label": "See all offers", "action": "offers.list"}
        elif use_case == "ask":
            cta = {"label": "Plan my visit", "action": "concierge.plan"}

        envelope = {
            "use_case": use_case,
            "verdict": verdict,
            "fit_score": None if suppressed else fit.score,
            "confidence": fit.confidence,
            "reasons": [] if suppressed else reasons,
            "signals": _signals(weather_day, travel, progress),
            "sources": sources,
            "degraded": degraded,
            "cta": cta,
            "disclaimer": DISCLAIMER,
            "generated_at": now.isoformat(),
            "cache_ttl_s": settings.concierge_answer_cache_ttl_s,
        }
        scores = {
            "fit_score": fit.score,
            "components": fit.components,
            "offers_ranked": len(offer_items),
            "suppressed": suppressed,
        }
        if use_case == "offers":
            envelope["items"] = offer_items
        if use_case == "plan":
            envelope["itinerary"] = _build_itinerary(
                tool_results, offer_items, travel, now
            )

    # Audit (golden rule #8): append-only row with inputs hash, tools called, scores, output.
    session.add(
        ConciergeAnswer(
            tenant_id=player.tenant_id,
            player_id=player.id,
            use_case=use_case,
            inputs_hash=inputs_hash,
            tools_called=sorted(tool_results),
            scores=scores,
            output=envelope,
        )
    )
    await session.flush()

    await cache.set(cache_key, json.dumps(envelope), settings.concierge_answer_cache_ttl_s)
    return envelope


def _build_itinerary(
    tool_results: dict[str, ToolResult],
    offer_items: list[dict[str, Any]],
    travel: TravelEstimate | None,
    now: datetime,
) -> list[dict[str, str]]:
    """Deterministic itinerary: leave → first stop (favorite dining) → top offers."""
    steps: list[dict[str, str]] = []
    leave = now + timedelta(minutes=45)
    drive_note = (
        f"{round(travel.duration_min)} min drive" if travel is not None else "head over"
    )
    steps.append(
        {
            "time": leave.strftime("%H:%M"),
            "title": "Leave home",
            "detail": f"Beat the traffic — {drive_note}.",
        }
    )
    prefs = tool_results.get("get_preferences")
    dining = prefs.data.get("favorite_dining") if prefs and prefs.ok else None
    arrive = leave + timedelta(minutes=round(travel.duration_min) if travel else 45)
    steps.append(
        {
            "time": arrive.strftime("%H:%M"),
            "title": f"Dinner at the {dining}" if dining else "Arrive & check in",
            "detail": "Your favorite spot." if dining else "Start at the players' desk.",
        }
    )
    slot = arrive + timedelta(minutes=90)
    for offer in offer_items[:2]:
        steps.append(
            {
                "time": slot.strftime("%H:%M"),
                "title": offer["title"],
                "detail": "Ranked for you — redeem in Offers.",
            }
        )
        slot += timedelta(minutes=60)
    return steps


async def list_history(
    session: AsyncSession, player: Player, limit: int = 20
) -> list[ConciergeAnswer]:
    return list(
        (
            await session.execute(
                select(ConciergeAnswer)
                .where(ConciergeAnswer.player_id == player.id)
                .order_by(ConciergeAnswer.created_at.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )
