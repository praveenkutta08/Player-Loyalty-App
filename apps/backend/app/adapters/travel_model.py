"""Shared deterministic drive-time model (P6.1).

Used by the mock TravelPort adapter and as the offline fallback for the real (OSRM) adapter:
haversine distance × a road-winding factor, a cruise speed, and rush-hour multipliers keyed on
the local departure hour. Fully deterministic — no clock reads, no randomness.
"""

from __future__ import annotations

import math
from datetime import datetime

# Great-circle → road distance correction (roads are never straight lines).
ROAD_WINDING_FACTOR = 1.25

# 55 mph cruise, per the integration plan's mock definition.
CRUISE_SPEED_KMH = 88.5

# Day-average congestion — what "typical" means for the -N min vs usual delta.
TYPICAL_MULTIPLIER = 1.15


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def road_distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    return haversine_km(lat1, lng1, lat2, lng2) * ROAD_WINDING_FACTOR


def rush_multiplier(depart_at: datetime) -> float:
    """Congestion multiplier for the local departure hour (deterministic)."""
    hour = depart_at.hour
    if 7 <= hour < 10:
        return 1.35  # morning rush
    if 16 <= hour < 19:
        return 1.45  # evening rush
    if 10 <= hour < 16:
        return 1.10  # daytime
    return 1.0  # night / early morning


def free_flow_duration_min(distance_km: float) -> float:
    return distance_km / CRUISE_SPEED_KMH * 60.0
