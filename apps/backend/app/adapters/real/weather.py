"""Real WeatherPort — Open-Meteo (free, keyless). https://open-meteo.com/en/docs"""

from __future__ import annotations

from datetime import date
from typing import Any

import httpx

from ...ports.errors import AdapterUnavailableError
from ...ports.weather import DailyForecast, Forecast

BASE_URL = "https://api.open-meteo.com/v1/forecast"
DAILY_FIELDS = (
    "weather_code,temperature_2m_max,temperature_2m_min,"
    "precipitation_probability_max,wind_speed_10m_max"
)


def _condition_for(code: int) -> str:
    """Collapse WMO weather codes into the port's coarse buckets."""
    if code == 0:
        return "clear"
    if code in (1, 2):
        return "partly_cloudy"
    if code == 3:
        return "overcast"
    if code in (45, 48):
        return "fog"
    if 71 <= code <= 77 or code in (85, 86):
        return "snow"
    if code >= 95:
        return "storm"
    return "rain"  # drizzle/rain/showers (51–67, 80–82) and anything unmapped


class OpenMeteoWeatherAdapter:
    def __init__(self, *, timeout_s: float = 5.0) -> None:
        self._timeout_s = timeout_s

    async def get_forecast(self, lat: float, lng: float, days: int = 3) -> Forecast:
        params: dict[str, Any] = {
            "latitude": lat,
            "longitude": lng,
            "daily": DAILY_FIELDS,
            "timezone": "auto",
            "forecast_days": max(1, min(days, 16)),
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_s) as client:
                response = await client.get(BASE_URL, params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError as exc:
            raise AdapterUnavailableError(f"open-meteo: {exc}") from exc

        daily = payload.get("daily") or {}
        try:
            out = tuple(
                DailyForecast(
                    day=date.fromisoformat(day),
                    condition=_condition_for(int(code)),
                    temp_high_c=float(high),
                    temp_low_c=float(low),
                    precipitation_chance=int(precip if precip is not None else 0),
                    wind_kph=float(wind if wind is not None else 0.0),
                )
                for day, code, high, low, precip, wind in zip(
                    daily["time"],
                    daily["weather_code"],
                    daily["temperature_2m_max"],
                    daily["temperature_2m_min"],
                    daily["precipitation_probability_max"],
                    daily["wind_speed_10m_max"],
                    strict=True,
                )
            )
        except (KeyError, TypeError, ValueError) as exc:
            raise AdapterUnavailableError(f"open-meteo: malformed response ({exc})") from exc
        return Forecast(lat=lat, lng=lng, days=out, source="open-meteo")
