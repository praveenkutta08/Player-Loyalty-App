"""Deterministic mock TravelPort — distance/55 mph with rush-hour multipliers (no randomness)."""

from __future__ import annotations

from datetime import datetime, timedelta

from ...ports.travel import GeoPoint, TrafficOutlook, TrafficWindow, TravelEstimate
from ..travel_model import (
    TYPICAL_MULTIPLIER,
    free_flow_duration_min,
    road_distance_km,
    rush_multiplier,
)
from .base import MockAdapterBase


class MockTravelAdapter(MockAdapterBase):
    async def get_travel_time(
        self, origin: GeoPoint, dest: GeoPoint, depart_at: datetime
    ) -> TravelEstimate:
        await self._simulate()
        distance = road_distance_km(origin.lat, origin.lng, dest.lat, dest.lng)
        base = free_flow_duration_min(distance)
        return TravelEstimate(
            origin=origin,
            dest=dest,
            distance_km=round(distance, 1),
            duration_min=round(base * rush_multiplier(depart_at), 1),
            typical_duration_min=round(base * TYPICAL_MULTIPLIER, 1),
            depart_at=depart_at,
            source="mock",
        )

    async def get_traffic_window(
        self, origin: GeoPoint, dest: GeoPoint, date_range: tuple[datetime, datetime]
    ) -> TrafficOutlook:
        await self._simulate()
        start, end = date_range
        distance = road_distance_km(origin.lat, origin.lng, dest.lat, dest.lng)
        base = free_flow_duration_min(distance)
        windows: list[TrafficWindow] = []
        cursor = start.replace(minute=0, second=0, microsecond=0)
        if cursor < start:
            cursor += timedelta(hours=1)
        while cursor <= end and len(windows) < 48:
            windows.append(
                TrafficWindow(
                    depart_at=cursor,
                    duration_min=round(base * rush_multiplier(cursor), 1),
                )
            )
            cursor += timedelta(hours=1)
        if not windows:  # degenerate range → single sample at start
            windows.append(
                TrafficWindow(depart_at=start, duration_min=round(base * rush_multiplier(start), 1))
            )
        best = min(windows, key=lambda w: (w.duration_min, w.depart_at))
        return TrafficOutlook(windows=tuple(windows), best=best)
