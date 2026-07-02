"""Cache TTL tests (P6.1): in-memory TTL semantics, the 30-min/5-min port wrappers, and Redis
graceful degradation. The Redis round-trip test runs only when the docker Redis is reachable."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import pytest
from app.adapters.caching import CachingTravelAdapter, CachingWeatherAdapter
from app.adapters.mock.travel import MockTravelAdapter
from app.adapters.mock.weather import MockWeatherAdapter
from app.core.cache import InMemoryCache, RedisCache
from app.core.settings import get_settings
from app.ports import Forecast, GeoPoint, TravelEstimate

VEGAS = GeoPoint(lat=36.1147, lng=-115.1728)
HENDERSON = GeoPoint(lat=36.0395, lng=-114.9817)


class _Clock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


class _CountingWeather:
    """Wraps the mock and counts inner calls so cache hits are observable."""

    def __init__(self) -> None:
        self.calls = 0
        self._inner = MockWeatherAdapter()

    async def get_forecast(self, lat: float, lng: float, days: int = 3) -> Forecast:
        self.calls += 1
        return await self._inner.get_forecast(lat, lng, days)


class _CountingTravel:
    def __init__(self) -> None:
        self.calls = 0
        self._inner = MockTravelAdapter()

    async def get_travel_time(
        self, origin: GeoPoint, dest: GeoPoint, depart_at: datetime
    ) -> TravelEstimate:
        self.calls += 1
        return await self._inner.get_travel_time(origin, dest, depart_at)

    async def get_traffic_window(self, origin, dest, date_range):  # type: ignore[no-untyped-def]
        self.calls += 1
        return await self._inner.get_traffic_window(origin, dest, date_range)


async def test_in_memory_cache_expires_by_ttl() -> None:
    clock = _Clock()
    cache = InMemoryCache(clock=clock)
    await cache.set("k", "v", ttl_s=60)
    assert await cache.get("k") == "v"
    clock.now += 59
    assert await cache.get("k") == "v"
    clock.now += 2  # past the TTL
    assert await cache.get("k") is None


async def test_weather_caches_for_30_minutes() -> None:
    clock = _Clock()
    inner = _CountingWeather()
    port = CachingWeatherAdapter(inner, cache=InMemoryCache(clock=clock), ttl_s=1800)

    first = await port.get_forecast(VEGAS.lat, VEGAS.lng, days=3)
    second = await port.get_forecast(VEGAS.lat, VEGAS.lng, days=3)
    assert inner.calls == 1  # served from cache
    assert second == first  # round-trips the frozen dataclasses intact

    clock.now += 1799
    await port.get_forecast(VEGAS.lat, VEGAS.lng, days=3)
    assert inner.calls == 1  # still inside the 30-min TTL

    clock.now += 2
    await port.get_forecast(VEGAS.lat, VEGAS.lng, days=3)
    assert inner.calls == 2  # TTL elapsed → refetched


async def test_travel_caches_for_5_minutes_and_buckets_departures() -> None:
    clock = _Clock()
    inner = _CountingTravel()
    port = CachingTravelAdapter(inner, cache=InMemoryCache(clock=clock), ttl_s=300)
    depart = datetime(2026, 7, 2, 17, 31, tzinfo=UTC)

    first = await port.get_travel_time(VEGAS, HENDERSON, depart)
    # 17:33 falls in the same 5-min bucket as 17:31 → cache hit.
    again = await port.get_travel_time(VEGAS, HENDERSON, depart.replace(minute=33))
    assert inner.calls == 1
    assert again == first

    clock.now += 301  # past the 5-min TTL
    await port.get_travel_time(VEGAS, HENDERSON, depart)
    assert inner.calls == 2

    outlook_range = (depart.replace(hour=6), depart.replace(hour=21))
    await port.get_traffic_window(VEGAS, HENDERSON, outlook_range)
    cached = await port.get_traffic_window(VEGAS, HENDERSON, outlook_range)
    assert inner.calls == 3
    assert cached.best.duration_min == min(w.duration_min for w in cached.windows)


async def test_redis_cache_degrades_gracefully_when_unreachable() -> None:
    cache = RedisCache("redis://127.0.0.1:9/0")  # nothing listens there
    await cache.set("k", "v", ttl_s=10)  # must not raise
    assert await cache.get("k") is None  # miss, not an error


async def test_redis_cache_roundtrip_against_docker_redis() -> None:
    cache = RedisCache(get_settings().redis_url)
    key = f"test:{uuid.uuid4().hex}"
    await cache.set(key, "value", ttl_s=30)
    value = await cache.get(key)
    if value is None:  # Redis not running → graceful degradation already covered above
        pytest.skip("redis unavailable — start it with `pnpm infra:up`")
    assert value == "value"
