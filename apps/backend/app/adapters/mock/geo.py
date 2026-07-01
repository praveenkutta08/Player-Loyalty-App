"""In-memory mock GeoPort. Deterministic: latitudes outside [24, 50] are 'out of jurisdiction'."""

from __future__ import annotations

from ...ports.geo import JurisdictionResult
from .base import MockAdapterBase

# Rough continental-US latitude band used as a stand-in allowed jurisdiction.
_MIN_LAT, _MAX_LAT = 24.0, 50.0


class MockGeoAdapter(MockAdapterBase):
    async def check_jurisdiction(self, latitude: float, longitude: float) -> JurisdictionResult:
        await self._simulate()
        allowed = _MIN_LAT <= latitude <= _MAX_LAT
        return JurisdictionResult(
            allowed=allowed,
            region="US-NV" if allowed else "OUT_OF_AREA",
            latitude=latitude,
            longitude=longitude,
        )

    async def reverse_geocode(self, latitude: float, longitude: float) -> str:
        await self._simulate()
        return f"{latitude:.4f}, {longitude:.4f} (Mock City)"
