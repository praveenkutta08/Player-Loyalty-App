"""GeoPort — geolocation/jurisdiction provider (compliance + reverse geocoding)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True)
class JurisdictionResult:
    allowed: bool
    region: str
    latitude: float
    longitude: float


@runtime_checkable
class GeoPort(Protocol):
    async def check_jurisdiction(self, latitude: float, longitude: float) -> JurisdictionResult: ...

    async def reverse_geocode(self, latitude: float, longitude: float) -> str: ...
