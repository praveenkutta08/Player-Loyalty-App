"""TravelPort — drive time + traffic outlook for concierge scoring (P6.1).

Real adapter = OSRM public routing with a haversine speed-model fallback (Google Distance Matrix
is a Phase-2 adapter swap); mock = distance/55 mph with deterministic rush-hour multipliers.
Results are cached (5 min) by the factory's caching wrapper.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class GeoPoint:
    lat: float
    lng: float


@dataclass(frozen=True)
class TravelEstimate:
    origin: GeoPoint
    dest: GeoPoint
    distance_km: float
    duration_min: float
    # Day-average duration for the same route, so UIs can show "-12 min vs usual".
    typical_duration_min: float
    depart_at: datetime
    source: str  # "osrm" | "haversine-model" | "mock"


@dataclass(frozen=True)
class TrafficWindow:
    depart_at: datetime
    duration_min: float


@dataclass(frozen=True)
class TrafficOutlook:
    """Hourly departure samples across a date range, plus the best (fastest) window."""

    windows: tuple[TrafficWindow, ...]
    best: TrafficWindow


@runtime_checkable
class TravelPort(Protocol):
    async def get_travel_time(
        self, origin: GeoPoint, dest: GeoPoint, depart_at: datetime
    ) -> TravelEstimate: ...

    async def get_traffic_window(
        self, origin: GeoPoint, dest: GeoPoint, date_range: tuple[datetime, datetime]
    ) -> TrafficOutlook: ...
