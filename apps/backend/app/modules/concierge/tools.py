"""MCP-shaped concierge tool registry (P6.2).

Every tool has a name, a JSON-schema args contract, and a typed JSON result — exactly the MCP
tool shape — but is invoked in-process by the orchestrator, so RLS and the tenant GUC stay
inside one request context (see AI_CONCIERGE_INTEGRATION.md §2, "MCP now vs. MCP later").

Each result carries its source id (player-mcp | offers-mcp | weather-mcp | maps-mcp) for the
UI's source chips. Failures never raise out of ``call_tool``: a failed tool returns
``ok=False`` + error code so answers can degrade ("couldn't reach maps — here's what I know").
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any, Protocol

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ports.errors import AdapterError
from app.ports.loyalty import LoyaltyPort
from app.ports.travel import GeoPoint, TravelPort
from app.ports.weather import WeatherPort

from ..offers import service as offers_service
from ..players.models import Player
from ..reservations.service import list_reservations
from .models import PlayerPreference, Property
from .scoring import (
    SOURCE_MAPS,
    SOURCE_OFFERS,
    SOURCE_PLAYER,
    SOURCE_WEATHER,
    rank_offers,
    tier_progress,
)

logger = structlog.get_logger(__name__)

SOURCES = (SOURCE_PLAYER, SOURCE_OFFERS, SOURCE_WEATHER, SOURCE_MAPS)


@dataclass
class ToolContext:
    """Everything a tool may touch — the session is already RLS-scoped to the caller."""

    session: AsyncSession
    player: Player
    loyalty: LoyaltyPort
    weather: WeatherPort
    travel: TravelPort


@dataclass(frozen=True)
class ToolResult:
    tool: str
    source: str
    ok: bool
    data: dict[str, Any]
    error: str | None = None


class ToolHandler(Protocol):
    async def __call__(self, ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class ToolSpec:
    name: str
    source: str
    description: str
    args_schema: dict[str, Any]  # JSON Schema — the MCP tool contract
    handler: ToolHandler


TOOLS: dict[str, ToolSpec] = {}


def _register(
    name: str, source: str, description: str, args_schema: dict[str, Any] | None = None
) -> Any:
    def decorator(handler: ToolHandler) -> ToolHandler:
        TOOLS[name] = ToolSpec(
            name=name,
            source=source,
            description=description,
            args_schema=args_schema
            or {"type": "object", "properties": {}, "additionalProperties": False},
            handler=handler,
        )
        return handler

    return decorator


def _validate_args(spec: ToolSpec, args: dict[str, Any]) -> str | None:
    """Minimal JSON-schema validation: required keys + primitive types."""
    schema = spec.args_schema
    for key in schema.get("required", []):
        if key not in args:
            return f"missing_arg:{key}"
    type_map: dict[str, type | tuple[type, ...]] = {
        "number": (int, float),
        "integer": int,
        "string": str,
        "boolean": bool,
    }
    for key, value in args.items():
        prop = schema.get("properties", {}).get(key)
        if prop is None:
            return f"unknown_arg:{key}"
        expected = type_map.get(prop.get("type", ""))
        if expected is not None and not isinstance(value, expected):
            return f"invalid_arg:{key}"
    return None


async def call_tool(name: str, ctx: ToolContext, args: dict[str, Any] | None = None) -> ToolResult:
    """Invoke a registered tool; adapter/validation failures degrade to ok=False."""
    spec = TOOLS.get(name)
    if spec is None:
        return ToolResult(
            tool=name, source="unknown", ok=False, data={}, error="unknown_tool"
        )
    args = args or {}
    if (validation_error := _validate_args(spec, args)) is not None:
        return ToolResult(
            tool=name, source=spec.source, ok=False, data={}, error=validation_error
        )
    try:
        data = await spec.handler(ctx, args)
    except AdapterError as exc:
        logger.warning("concierge.tool_degraded", tool=name, error=str(exc))
        return ToolResult(
            tool=name, source=spec.source, ok=False, data={}, error="provider_unavailable"
        )
    return ToolResult(tool=name, source=spec.source, ok=True, data=data)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


# ------------------------------------------------------------------ player-mcp
@_register("get_player_profile", SOURCE_PLAYER, "Identity, segment, and consent posture.")
async def _get_player_profile(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    player = ctx.player
    return {
        "id": str(player.id),
        "email": player.email,
        "segment": player.segment,
        "status": player.status,
        "kyc_status": player.kyc_status,
        "location_consent": player.location_consent,
        "concierge_consent": player.concierge_consent,
        "has_home_origin": player.home_origin is not None,
    }


@_register("get_player_value", SOURCE_PLAYER, "Worth band, ADT and visit cadence signals.")
async def _get_player_value(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    value = await ctx.loyalty.get_player_value(str(ctx.player.id))
    return asdict(value)


@_register("get_tier_progress", SOURCE_PLAYER, "Loyalty points, tier, and gap to next tier.")
async def _get_tier_progress(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    account = await ctx.loyalty.get_account(str(ctx.player.id))
    progress = tier_progress(account.points)
    return asdict(progress)


@_register(
    "get_recent_activity",
    SOURCE_PLAYER,
    "Recent loyalty/gaming activity.",
    {
        "type": "object",
        "properties": {"limit": {"type": "integer"}},
        "additionalProperties": False,
    },
)
async def _get_recent_activity(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    limit = int(args.get("limit", 10))
    activity = await ctx.loyalty.get_activity(str(ctx.player.id), limit=limit)
    return {
        "items": [
            {
                "type": a.type,
                "description": a.description,
                "points": a.points,
                "amount_cents": a.amount_cents,
                "at": a.at.isoformat(),
            }
            for a in activity
        ]
    }


@_register("get_preferences", SOURCE_PLAYER, "Favorite property, dining, and experiences.")
async def _get_preferences(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    pref = (
        await ctx.session.execute(
            select(PlayerPreference).where(PlayerPreference.player_id == ctx.player.id)
        )
    ).scalar_one_or_none()
    if pref is None:
        return {"favorite_property_id": None, "favorite_dining": None, "favorite_experiences": []}
    return {
        "favorite_property_id": str(pref.favorite_property_id)
        if pref.favorite_property_id
        else None,
        "favorite_dining": pref.favorite_dining,
        "favorite_experiences": list(pref.favorite_experiences or []),
    }


@_register(
    "list_trip_history",
    SOURCE_PLAYER,
    "Past and upcoming reservations (hotel/dining/show/spa).",
    {
        "type": "object",
        "properties": {"limit": {"type": "integer"}},
        "additionalProperties": False,
    },
)
async def _list_trip_history(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    limit = int(args.get("limit", 10))
    reservations = await list_reservations(
        ctx.session, ctx.player.tenant_id, player_id=ctx.player.id
    )
    return {
        "items": [
            {
                "id": str(r.id),
                "type": r.type,
                "status": r.status,
                "start_at": _iso(r.start_at),
                "end_at": _iso(r.end_at),
            }
            for r in reservations[:limit]
        ]
    }


# ------------------------------------------------------------------ offers-mcp
@_register(
    "list_offers",
    SOURCE_OFFERS,
    "Published offers targeted at the player, ranked (score + why_you reasons).",
    {
        "type": "object",
        "properties": {
            "kind": {"type": "string"},
            "limit": {"type": "integer"},
            "weather_condition": {"type": "string"},
        },
        "additionalProperties": False,
    },
)
async def _list_offers(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    kind = str(args.get("kind", "offer"))
    limit = int(args.get("limit", 10))
    weather_condition = args.get("weather_condition")
    offers = await offers_service.list_targeted(ctx.session, ctx.player, kind)
    ranked = rank_offers(
        [
            {
                "id": o.id,
                "title": o.title,
                "kind": o.kind,
                "segment": o.segment,
                "end_at": o.end_at,
            }
            for o in offers
        ],
        segment=ctx.player.segment,
        now=datetime.now(UTC),
        weather_condition=weather_condition,
        limit=limit,
    )
    return {"items": [asdict(r) for r in ranked]}


# ------------------------------------------------------------------ weather-mcp
@_register(
    "weather.get_forecast",
    SOURCE_WEATHER,
    "Daily forecast at a location.",
    {
        "type": "object",
        "properties": {
            "lat": {"type": "number"},
            "lng": {"type": "number"},
            "days": {"type": "integer"},
        },
        "required": ["lat", "lng"],
        "additionalProperties": False,
    },
)
async def _weather_forecast(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    forecast = await ctx.weather.get_forecast(
        float(args["lat"]), float(args["lng"]), days=int(args.get("days", 3))
    )
    return asdict(forecast) | {
        "days": [asdict(d) | {"day": d.day.isoformat()} for d in forecast.days]
    }


# ------------------------------------------------------------------ maps-mcp
@_register(
    "list_nearby_properties",
    SOURCE_MAPS,
    "Tenant properties, with drive distance from the player's stored origin when consented.",
)
async def _list_nearby_properties(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    from ...adapters.travel_model import road_distance_km

    properties = (
        (
            await ctx.session.execute(
                select(Property).where(Property.status == "active").order_by(Property.name)
            )
        )
        .scalars()
        .all()
    )
    origin = ctx.player.home_origin if ctx.player.concierge_consent else None
    items = []
    for prop in properties:
        entry: dict[str, Any] = {
            "id": str(prop.id),
            "name": prop.name,
            "lat": prop.lat,
            "lng": prop.lng,
            "amenities": list(prop.amenities or []),
        }
        if origin is not None:
            entry["distance_km"] = round(
                road_distance_km(
                    float(origin["lat"]), float(origin["lng"]), prop.lat, prop.lng
                ),
                1,
            )
        items.append(entry)
    if origin is not None:
        items.sort(key=lambda e: (e.get("distance_km", 1e9), str(e["name"])))
    return {"items": items, "origin_available": origin is not None}


@_register(
    "maps.get_travel_time",
    SOURCE_MAPS,
    "Drive time from the player's stored origin to a destination (consent-gated).",
    {
        "type": "object",
        "properties": {
            "dest_lat": {"type": "number"},
            "dest_lng": {"type": "number"},
        },
        "required": ["dest_lat", "dest_lng"],
        "additionalProperties": False,
    },
)
async def _travel_time(ctx: ToolContext, args: dict[str, Any]) -> dict[str, Any]:
    # GUARDRAIL: stored-origin travel math requires the separate concierge consent.
    if not ctx.player.concierge_consent or not ctx.player.home_origin:
        raise AdapterError("no consented home origin")
    origin = ctx.player.home_origin
    estimate = await ctx.travel.get_travel_time(
        GeoPoint(lat=float(origin["lat"]), lng=float(origin["lng"])),
        GeoPoint(lat=float(args["dest_lat"]), lng=float(args["dest_lng"])),
        datetime.now(UTC),
    )
    payload = asdict(estimate)
    payload["depart_at"] = estimate.depart_at.isoformat()
    return payload
