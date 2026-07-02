"""Deterministic mock WeatherPort — seeded by (coords, date) so offline demos/tests are stable."""

from __future__ import annotations

import random
from datetime import UTC, datetime, timedelta

from ...ports.weather import CONDITIONS, DailyForecast, Forecast
from .base import MockAdapterBase

# Weighted toward pleasant weather so demo verdicts skew positive but rain days still occur.
_CONDITION_WEIGHTS = {
    "clear": 34,
    "partly_cloudy": 28,
    "overcast": 14,
    "fog": 4,
    "rain": 14,
    "snow": 2,
    "storm": 4,
}


class MockWeatherAdapter(MockAdapterBase):
    async def get_forecast(self, lat: float, lng: float, days: int = 3) -> Forecast:
        await self._simulate()
        days = max(1, min(days, 16))
        today = datetime.now(UTC).date()
        out: list[DailyForecast] = []
        for offset in range(days):
            day = today + timedelta(days=offset)
            # Seed per (location, date): same inputs → same forecast, changes daily.
            rng = random.Random(f"{lat:.2f}:{lng:.2f}:{day.isoformat()}")
            condition = rng.choices(
                list(_CONDITION_WEIGHTS), weights=list(_CONDITION_WEIGHTS.values())
            )[0]
            # Base temperature falls off with latitude; small daily jitter.
            base = 32.0 - abs(lat) * 0.45 + rng.uniform(-4, 4)
            high = round(base, 1)
            low = round(base - rng.uniform(6, 12), 1)
            precip = {
                "rain": rng.randint(55, 90),
                "storm": rng.randint(70, 100),
                "snow": rng.randint(50, 85),
            }.get(condition, rng.randint(0, 25))
            out.append(
                DailyForecast(
                    day=day,
                    condition=condition,
                    temp_high_c=high,
                    temp_low_c=low,
                    precipitation_chance=precip,
                    wind_kph=round(rng.uniform(4, 32), 1),
                )
            )
        return Forecast(lat=lat, lng=lng, days=tuple(out), source="mock")


# Sanity: every generated condition must be a known bucket.
assert set(_CONDITION_WEIGHTS) == set(CONDITIONS)
