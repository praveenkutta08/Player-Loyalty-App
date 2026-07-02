"""WeatherPort — daily forecast context for concierge scoring (P6.1).

Real adapter = Open-Meteo (free, keyless); mock = deterministic generator seeded by date so
tests and offline demos are stable. Results are cached (30 min) by the factory's caching wrapper.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Protocol, runtime_checkable

# Normalized condition buckets — scoring only needs coarse buckets, not provider codes.
CONDITIONS = ("clear", "partly_cloudy", "overcast", "fog", "rain", "snow", "storm")


@dataclass(frozen=True)
class DailyForecast:
    day: date
    condition: str  # one of CONDITIONS
    temp_high_c: float
    temp_low_c: float
    precipitation_chance: int  # 0–100
    wind_kph: float


@dataclass(frozen=True)
class Forecast:
    lat: float
    lng: float
    days: tuple[DailyForecast, ...]
    source: str  # "open-meteo" | "mock"


@runtime_checkable
class WeatherPort(Protocol):
    async def get_forecast(self, lat: float, lng: float, days: int = 3) -> Forecast: ...
