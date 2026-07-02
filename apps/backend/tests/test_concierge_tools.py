"""Tool registry tests (P6.2): sourced results, arg validation, consent guardrails, and tenant
isolation — every DB-backed tool runs under the caller's RLS context and only sees its tenant."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.adapters.mock.loyalty import MockLoyaltyAdapter
from app.adapters.mock.travel import MockTravelAdapter
from app.adapters.mock.weather import MockWeatherAdapter
from app.db.session import SessionLocal
from app.modules.concierge.models import PlayerPreference, Property
from app.modules.concierge.tools import SOURCES, TOOLS, ToolContext, call_tool
from app.modules.offers.models import Offer, OfferKind, OfferStatus
from app.modules.players.models import Player
from app.tenancy.deps import set_tenant_context
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ._helpers import create_player, create_tenant, unique

EXPECTED_TOOLS = {
    "get_player_profile",
    "get_player_value",
    "get_tier_progress",
    "get_recent_activity",
    "get_preferences",
    "list_trip_history",
    "list_offers",
    "weather.get_forecast",
    "list_nearby_properties",
    "maps.get_travel_time",
}


def _ctx(session: AsyncSession, player: Player) -> ToolContext:
    return ToolContext(
        session=session,
        player=player,
        loyalty=MockLoyaltyAdapter(),
        weather=MockWeatherAdapter(),
        travel=MockTravelAdapter(),
    )


async def _load_player(session: AsyncSession, player_id: UUID) -> Player:
    return (
        await session.execute(select(Player).where(Player.id == player_id))
    ).scalar_one()


async def _seed_two_tenants() -> tuple[UUID, UUID, UUID, UUID]:
    """Two tenants, one player each, one offer + property each. Returns their ids."""
    tenant_a = await create_tenant(unique("tools-a"))
    tenant_b = await create_tenant(unique("tools-b"))
    player_a = await create_player(tenant_a.id, f"{unique('ta')}@example.com", segment="vip")
    player_b = await create_player(tenant_b.id, f"{unique('tb')}@example.com")
    async with SessionLocal() as session:
        session.add_all(
            [
                Offer(
                    tenant_id=tenant_a.id,
                    kind=OfferKind.offer.value,
                    title="A-only offer",
                    status=OfferStatus.published.value,
                    segment="all",
                    end_at=datetime.now(UTC) + timedelta(days=2),
                ),
                Offer(
                    tenant_id=tenant_b.id,
                    kind=OfferKind.offer.value,
                    title="B-only offer",
                    status=OfferStatus.published.value,
                    segment="all",
                ),
                Property(
                    tenant_id=tenant_a.id, name=unique("A Resort"), lat=36.11, lng=-115.17
                ),
                Property(
                    tenant_id=tenant_b.id, name=unique("B Resort"), lat=39.53, lng=-119.81
                ),
            ]
        )
        await session.commit()
    return tenant_a.id, tenant_b.id, player_a.id, player_b.id


def test_registry_shape() -> None:
    assert set(TOOLS) == EXPECTED_TOOLS
    for spec in TOOLS.values():
        assert spec.source in SOURCES
        assert spec.args_schema.get("type") == "object"
        assert spec.description


async def test_tools_return_sourced_tenant_scoped_data(db_engine: object) -> None:
    tenant_a, _tenant_b, player_a_id, _player_b_id = await _seed_two_tenants()

    async with SessionLocal() as session:
        await set_tenant_context(session, tenant_a)
        player = await _load_player(session, player_a_id)
        ctx = _ctx(session, player)

        profile = await call_tool("get_player_profile", ctx)
        assert profile.ok and profile.source == "player-mcp"
        assert profile.data["segment"] == "vip"

        value = await call_tool("get_player_value", ctx)
        assert value.ok and value.data["persona"] in {
            "regional_commuter",
            "weekend_destination",
            "high_value_local",
        }

        tier = await call_tool("get_tier_progress", ctx)
        assert tier.ok and tier.data["tier"] == "bronze"

        activity = await call_tool("get_recent_activity", ctx, {"limit": 2})
        assert activity.ok and len(activity.data["items"]) == 2

        prefs = await call_tool("get_preferences", ctx)
        assert prefs.ok and prefs.data["favorite_experiences"] == []

        trips = await call_tool("list_trip_history", ctx)
        assert trips.ok and trips.data["items"] == []

        # Tenant isolation: only tenant A's offer/property are visible under A's RLS context.
        offers = await call_tool("list_offers", ctx, {"kind": "offer"})
        assert offers.ok and offers.source == "offers-mcp"
        titles = [o["title"] for o in offers.data["items"]]
        assert "A-only offer" in titles and "B-only offer" not in titles
        assert offers.data["items"][0]["why_you"]  # ranked with machine-readable reasons

        nearby = await call_tool("list_nearby_properties", ctx)
        assert nearby.ok and nearby.source == "maps-mcp"
        names = [p["name"] for p in nearby.data["items"]]
        assert any("A Resort" in n for n in names)
        assert not any("B Resort" in n for n in names)
        assert nearby.data["origin_available"] is False  # no consent yet

        forecast = await call_tool(
            "weather.get_forecast", ctx, {"lat": 36.11, "lng": -115.17, "days": 2}
        )
        assert forecast.ok and forecast.source == "weather-mcp"
        assert len(forecast.data["days"]) == 2


async def test_travel_tool_requires_consented_origin(db_engine: object) -> None:
    tenant_a, _tenant_b, player_a_id, _player_b_id = await _seed_two_tenants()

    async with SessionLocal() as session:
        await set_tenant_context(session, tenant_a)
        player = await _load_player(session, player_a_id)
        ctx = _ctx(session, player)

        # GUARDRAIL: no concierge consent / origin → degraded result, not an exception.
        denied = await call_tool(
            "maps.get_travel_time", ctx, {"dest_lat": 36.11, "dest_lng": -115.17}
        )
        assert not denied.ok and denied.error == "provider_unavailable"

        player.concierge_consent = True
        player.home_origin = {"lat": 36.0, "lng": -115.0, "label": "Home"}
        granted = await call_tool(
            "maps.get_travel_time", ctx, {"dest_lat": 36.11, "dest_lng": -115.17}
        )
        assert granted.ok and granted.source == "maps-mcp"
        assert granted.data["duration_min"] > 0

        # With consent, nearby properties gain distances sorted ascending.
        nearby = await call_tool("list_nearby_properties", ctx)
        assert nearby.data["origin_available"] is True
        assert all("distance_km" in p for p in nearby.data["items"])


async def test_unknown_tool_and_bad_args_degrade(db_engine: object) -> None:
    tenant_a, _tenant_b, player_a_id, _player_b_id = await _seed_two_tenants()
    async with SessionLocal() as session:
        await set_tenant_context(session, tenant_a)
        player = await _load_player(session, player_a_id)
        ctx = _ctx(session, player)

        missing = await call_tool("weather.get_forecast", ctx, {"lat": 36.0})
        assert not missing.ok and missing.error == "missing_arg:lng"

        wrong_type = await call_tool("weather.get_forecast", ctx, {"lat": 36.0, "lng": "x"})
        assert not wrong_type.ok and wrong_type.error == "invalid_arg:lng"

        unknown_arg = await call_tool("get_player_profile", ctx, {"nope": 1})
        assert not unknown_arg.ok and unknown_arg.error == "unknown_arg:nope"

        unknown_tool = await call_tool("does.not.exist", ctx)
        assert not unknown_tool.ok and unknown_tool.error == "unknown_tool"


async def test_preferences_reflect_rows_and_stay_scoped(db_engine: object) -> None:
    tenant_a, tenant_b, player_a_id, player_b_id = await _seed_two_tenants()

    async with SessionLocal() as session:  # seed prefs for both tenants as owner
        prop_a = (
            await session.execute(
                select(Property).where(Property.tenant_id == tenant_a)
            )
        ).scalars().first()
        assert prop_a is not None
        session.add_all(
            [
                PlayerPreference(
                    tenant_id=tenant_a,
                    player_id=player_a_id,
                    favorite_property_id=prop_a.id,
                    favorite_dining="steakhouse",
                    favorite_experiences=["slots"],
                ),
                PlayerPreference(
                    tenant_id=tenant_b, player_id=player_b_id, favorite_dining="buffet"
                ),
            ]
        )
        await session.commit()

    async with SessionLocal() as session:
        await set_tenant_context(session, tenant_a)
        player = await _load_player(session, player_a_id)
        prefs = await call_tool("get_preferences", _ctx(session, player))
        assert prefs.ok
        assert prefs.data["favorite_dining"] == "steakhouse"
        assert prefs.data["favorite_experiences"] == ["slots"]
