"""Real TravelPort — OSRM public routing with the haversine speed model as offline fallback.

OSRM's demo server returns free-flow durations (no live traffic), so the same deterministic
rush-hour multipliers as the mock shape `duration` vs `typical`. Google Distance Matrix is the
documented Phase-2 swap for true live traffic.
"""

from __future__ import annotations

from datetime import datetime, timedelta

import httpx
import structlog

from ...ports.travel import GeoPoint, TrafficOutlook, TrafficWindow, TravelEstimate
from ..travel_model import (
    TYPICAL_MULTIPLIER,
    free_flow_duration_min,
    road_distance_km,
    rush_multiplier,
)

logger = structlog.get_logger(__name__)

BASE_URL = "https://router.project-osrm.org"


class OsrmTravelAdapter:
    def __init__(self, *, timeout_s: float = 5.0) -> None:
        self._timeout_s = timeout_s

    async def _route_base(
        self, origin: GeoPoint, dest: GeoPoint
    ) -> tuple[float, float, str]:
        """Return (distance_km, free-flow duration_min, source), falling back to the model."""
        url = (
            f"{BASE_URL}/route/v1/driving/"
            f"{origin.lng},{origin.lat};{dest.lng},{dest.lat}?overview=false"
        )
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
            route = payload["routes"][0]
            return float(route["distance"]) / 1000.0, float(route["duration"]) / 60.0, "osrm"
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as exc:
            # Never fail travel math on a routing outage — degrade to the deterministic model.
            logger.warning("travel.osrm_fallback", error=str(exc))
            distance = road_distance_km(origin.lat, origin.lng, dest.lat, dest.lng)
            return distance, free_flow_duration_min(distance), "haversine-model"

    async def get_travel_time(
        self, origin: GeoPoint, dest: GeoPoint, depart_at: datetime
    ) -> TravelEstimate:
        distance_km, base_min, source = await self._route_base(origin, dest)
        return TravelEstimate(
            origin=origin,
            dest=dest,
            distance_km=round(distance_km, 1),
            duration_min=round(base_min * rush_multiplier(depart_at), 1),
            typical_duration_min=round(base_min * TYPICAL_MULTIPLIER, 1),
            depart_at=depart_at,
            source=source,
        )

    async def get_traffic_window(
        self, origin: GeoPoint, dest: GeoPoint, date_range: tuple[datetime, datetime]
    ) -> TrafficOutlook:
        start, end = date_range
        distance_km, base_min, _source = await self._route_base(origin, dest)
        del distance_km
        windows: list[TrafficWindow] = []
        cursor = start.replace(minute=0, second=0, microsecond=0)
        if cursor < start:
            cursor += timedelta(hours=1)
        while cursor <= end and len(windows) < 48:
            windows.append(
                TrafficWindow(
                    depart_at=cursor, duration_min=round(base_min * rush_multiplier(cursor), 1)
                )
            )
            cursor += timedelta(hours=1)
        if not windows:
            windows.append(
                TrafficWindow(
                    depart_at=start, duration_min=round(base_min * rush_multiplier(start), 1)
                )
            )
        best = min(windows, key=lambda w: (w.duration_min, w.depart_at))
        return TrafficOutlook(windows=tuple(windows), best=best)
