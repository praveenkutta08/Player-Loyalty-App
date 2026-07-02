"""Caching wrappers for the external-context ports (P6.1).

WeatherPort results cache 30 min and TravelPort 5 min (TTLs from settings). The wrappers sit in
front of whichever adapter the factory selected — mock or real — and serialize the frozen
dataclasses to JSON. Cache keys normalize coordinates (3 dp ≈ 110 m) and bucket departure times
(5 min) so nearby requests share entries.
"""

from __future__ import annotations

import json
from dataclasses import asdict
from datetime import date, datetime

from ..core.cache import CachePort
from ..ports.travel import (
    GeoPoint,
    TrafficOutlook,
    TrafficWindow,
    TravelEstimate,
    TravelPort,
)
from ..ports.weather import DailyForecast, Forecast, WeatherPort


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value)


def _json_default(value: object) -> str:
    if isinstance(value, datetime | date):
        return value.isoformat()
    raise TypeError(f"unserializable cache value: {type(value)!r}")


def _bucket_minutes(at: datetime, minutes: int = 5) -> str:
    floored = at.replace(minute=at.minute - at.minute % minutes, second=0, microsecond=0)
    return floored.isoformat()


class CachingWeatherAdapter:
    def __init__(self, inner: WeatherPort, *, cache: CachePort, ttl_s: int) -> None:
        self._inner = inner
        self._cache = cache
        self._ttl_s = ttl_s

    async def get_forecast(self, lat: float, lng: float, days: int = 3) -> Forecast:
        key = f"weather:{lat:.3f}:{lng:.3f}:{days}"
        cached = await self._cache.get(key)
        if cached is not None:
            raw = json.loads(cached)
            return Forecast(
                lat=raw["lat"],
                lng=raw["lng"],
                source=raw["source"],
                days=tuple(
                    DailyForecast(
                        day=date.fromisoformat(d["day"]),
                        condition=d["condition"],
                        temp_high_c=d["temp_high_c"],
                        temp_low_c=d["temp_low_c"],
                        precipitation_chance=d["precipitation_chance"],
                        wind_kph=d["wind_kph"],
                    )
                    for d in raw["days"]
                ),
            )
        forecast = await self._inner.get_forecast(lat, lng, days)
        await self._cache.set(key, json.dumps(asdict(forecast), default=_json_default), self._ttl_s)
        return forecast


class CachingTravelAdapter:
    def __init__(self, inner: TravelPort, *, cache: CachePort, ttl_s: int) -> None:
        self._inner = inner
        self._cache = cache
        self._ttl_s = ttl_s

    @staticmethod
    def _route_key(origin: GeoPoint, dest: GeoPoint) -> str:
        return f"{origin.lat:.3f},{origin.lng:.3f}:{dest.lat:.3f},{dest.lng:.3f}"

    async def get_travel_time(
        self, origin: GeoPoint, dest: GeoPoint, depart_at: datetime
    ) -> TravelEstimate:
        key = f"travel:{self._route_key(origin, dest)}:{_bucket_minutes(depart_at)}"
        cached = await self._cache.get(key)
        if cached is not None:
            raw = json.loads(cached)
            return TravelEstimate(
                origin=GeoPoint(**raw["origin"]),
                dest=GeoPoint(**raw["dest"]),
                distance_km=raw["distance_km"],
                duration_min=raw["duration_min"],
                typical_duration_min=raw["typical_duration_min"],
                depart_at=_dt(raw["depart_at"]),
                source=raw["source"],
            )
        estimate = await self._inner.get_travel_time(origin, dest, depart_at)
        await self._cache.set(key, json.dumps(asdict(estimate), default=_json_default), self._ttl_s)
        return estimate

    async def get_traffic_window(
        self, origin: GeoPoint, dest: GeoPoint, date_range: tuple[datetime, datetime]
    ) -> TrafficOutlook:
        start, end = date_range
        key = (
            f"traffic:{self._route_key(origin, dest)}:"
            f"{_bucket_minutes(start, 60)}:{_bucket_minutes(end, 60)}"
        )
        cached = await self._cache.get(key)
        if cached is not None:
            raw = json.loads(cached)
            windows = tuple(
                TrafficWindow(depart_at=_dt(w["depart_at"]), duration_min=w["duration_min"])
                for w in raw["windows"]
            )
            return TrafficOutlook(
                windows=windows,
                best=TrafficWindow(
                    depart_at=_dt(raw["best"]["depart_at"]),
                    duration_min=raw["best"]["duration_min"],
                ),
            )
        outlook = await self._inner.get_traffic_window(origin, dest, date_range)
        await self._cache.set(key, json.dumps(asdict(outlook), default=_json_default), self._ttl_s)
        return outlook
