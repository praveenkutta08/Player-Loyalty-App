"""Contract tests for the concierge external-context ports (P6.1).

Mock adapters run always (deterministic); real adapters (Open-Meteo / OSRM) hit external APIs,
so they are opt-in via ``RUN_EXTERNAL_API_TESTS=1`` and skipped offline/in CI by default. The
real adapters' offline *fallback* paths are still exercised here by pointing them at a dead port.
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

import pytest
from app.adapters import factory
from app.adapters.caching import CachingTravelAdapter, CachingWeatherAdapter
from app.adapters.mock.loyalty import MockLoyaltyAdapter
from app.adapters.mock.travel import MockTravelAdapter
from app.adapters.mock.weather import MockWeatherAdapter
from app.adapters.real import travel as real_travel
from app.adapters.real import weather as real_weather
from app.core.settings import get_settings
from app.ports import GeoPoint, TravelPort, WeatherPort
from app.ports.errors import AdapterError, AdapterUnavailableError
from app.ports.weather import CONDITIONS

EXTERNAL = pytest.mark.skipif(
    not os.environ.get("RUN_EXTERNAL_API_TESTS"),
    reason="external API tests are opt-in (RUN_EXTERNAL_API_TESTS=1)",
)

VEGAS = GeoPoint(lat=36.1147, lng=-115.1728)
HENDERSON = GeoPoint(lat=36.0395, lng=-114.9817)


# --------------------------------------------------------------------------- weather (mock)
@pytest.fixture(params=[MockWeatherAdapter])
def weather(request: pytest.FixtureRequest) -> WeatherPort:
    return request.param()


async def test_weather_forecast_shape(weather: WeatherPort) -> None:
    forecast = await weather.get_forecast(VEGAS.lat, VEGAS.lng, days=3)
    assert len(forecast.days) == 3
    for day in forecast.days:
        assert day.condition in CONDITIONS
        assert day.temp_low_c <= day.temp_high_c
        assert 0 <= day.precipitation_chance <= 100


async def test_mock_weather_is_deterministic_per_date() -> None:
    a = await MockWeatherAdapter().get_forecast(VEGAS.lat, VEGAS.lng, days=5)
    b = await MockWeatherAdapter().get_forecast(VEGAS.lat, VEGAS.lng, days=5)
    assert a.days == b.days  # seeded by (coords, date) — stable within a day
    other = await MockWeatherAdapter().get_forecast(45.0, -73.6, days=5)
    assert other.days != a.days  # different location → different seed


# --------------------------------------------------------------------------- travel (mock)
@pytest.fixture(params=[MockTravelAdapter])
def travel(request: pytest.FixtureRequest) -> TravelPort:
    return request.param()


async def test_travel_time_rush_hour_and_distance(travel: TravelPort) -> None:
    rush = await travel.get_travel_time(
        VEGAS, HENDERSON, datetime(2026, 7, 2, 17, 30, tzinfo=UTC)
    )
    night = await travel.get_travel_time(
        VEGAS, HENDERSON, datetime(2026, 7, 2, 3, 0, tzinfo=UTC)
    )
    assert rush.distance_km == night.distance_km > 0
    assert rush.duration_min > night.duration_min  # evening rush multiplier
    assert night.duration_min > 0
    assert rush.typical_duration_min > 0


async def test_traffic_window_prefers_off_peak(travel: TravelPort) -> None:
    start = datetime(2026, 7, 2, 6, 0, tzinfo=UTC)
    end = datetime(2026, 7, 2, 21, 0, tzinfo=UTC)
    outlook = await travel.get_traffic_window(VEGAS, HENDERSON, (start, end))
    assert outlook.windows
    assert outlook.best.duration_min == min(w.duration_min for w in outlook.windows)
    assert outlook.best.depart_at.hour not in range(16, 19)  # never picks evening rush


# --------------------------------------------------------------------------- loyalty value
async def test_player_value_personas_are_stable_and_cover_all_three() -> None:
    loyalty = MockLoyaltyAdapter()
    seen: set[str] = set()
    for ref in ("player-a", "player-b", "player-c", "player-d", "player-e", "player-f"):
        first = await loyalty.get_player_value(ref)
        again = await loyalty.get_player_value(ref)
        assert first == again  # deterministic per player_ref
        assert first.player_ref == ref
        assert first.worth_band in {"low", "mid", "high"}
        assert first.adt_cents > 0
        seen.add(first.persona)
    assert seen == {"regional_commuter", "weekend_destination", "high_value_local"}


# --------------------------------------------------------------------------- real adapters
async def test_real_weather_offline_raises_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(real_weather, "BASE_URL", "http://127.0.0.1:9/forecast")
    adapter = real_weather.OpenMeteoWeatherAdapter(timeout_s=0.2)
    with pytest.raises(AdapterUnavailableError):
        await adapter.get_forecast(VEGAS.lat, VEGAS.lng, days=1)


async def test_real_travel_falls_back_to_model_offline(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(real_travel, "BASE_URL", "http://127.0.0.1:9")
    adapter = real_travel.OsrmTravelAdapter(timeout_s=0.2)
    estimate = await adapter.get_travel_time(VEGAS, HENDERSON, datetime(2026, 7, 2, 12, 0))
    assert estimate.source == "haversine-model"  # routing outage degrades, never fails
    assert estimate.duration_min > 0


@EXTERNAL
async def test_real_weather_open_meteo() -> None:
    forecast = await real_weather.OpenMeteoWeatherAdapter().get_forecast(
        VEGAS.lat, VEGAS.lng, days=2
    )
    assert forecast.source == "open-meteo"
    assert len(forecast.days) == 2
    assert all(d.condition in CONDITIONS for d in forecast.days)


@EXTERNAL
async def test_real_travel_osrm() -> None:
    estimate = await real_travel.OsrmTravelAdapter().get_travel_time(
        VEGAS, HENDERSON, datetime(2026, 7, 2, 12, 0)
    )
    assert estimate.source == "osrm"
    assert estimate.distance_km > 5
    assert estimate.duration_min > 0


# --------------------------------------------------------------------------- factory
def test_factory_returns_cached_ports() -> None:
    factory.get_weather_port.cache_clear()
    factory.get_travel_port.cache_clear()
    weather_port = factory.get_weather_port()
    travel_port = factory.get_travel_port()
    assert isinstance(weather_port, WeatherPort)
    assert isinstance(travel_port, TravelPort)
    # ADAPTER_MODE=mock (default) → caching wrapper around the mock.
    assert isinstance(weather_port, CachingWeatherAdapter)
    assert isinstance(travel_port, CachingTravelAdapter)
    factory.get_weather_port.cache_clear()
    factory.get_travel_port.cache_clear()


def test_factory_rejects_unknown_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(get_settings(), "weather_provider", "bogus")
    factory.get_weather_port.cache_clear()
    try:
        with pytest.raises(AdapterError):
            factory.get_weather_port()
    finally:
        monkeypatch.setattr(get_settings(), "weather_provider", None)
        factory.get_weather_port.cache_clear()
