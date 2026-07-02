"""Adapter selection: choose a port implementation by env (ADAPTER_MODE / *_PROVIDER).

Each ``get_*_port`` is a cached FastAPI dependency returning the interface type; domain code
injects the port, never a concrete class. Only ``mock`` is implemented for the MVP — other
providers raise a clear error until their adapters land.
"""

from __future__ import annotations

from functools import lru_cache

from ..core.cache import get_cache
from ..core.settings import get_settings
from ..ports import (
    CashlessPort,
    ChatPort,
    DigitalKeyPort,
    GeoPort,
    KycPort,
    LoyaltyPort,
    PaymentPort,
    PushPort,
    TravelPort,
    WeatherPort,
)
from ..ports.errors import AdapterError
from .caching import CachingTravelAdapter, CachingWeatherAdapter
from .mock.cashless import MockCashlessAdapter
from .mock.chat import MockChatAdapter
from .mock.digital_key import MockDigitalKeyAdapter
from .mock.geo import MockGeoAdapter
from .mock.kyc import MockKycAdapter
from .mock.loyalty import MockLoyaltyAdapter
from .mock.payment import MockPaymentAdapter
from .mock.push import MockPushAdapter
from .mock.travel import MockTravelAdapter
from .mock.weather import MockWeatherAdapter
from .real.travel import OsrmTravelAdapter
from .real.weather import OpenMeteoWeatherAdapter


def _resolve(port_name: str, provider: str | None) -> str:
    settings = get_settings()
    return (provider or settings.adapter_mode).lower()


def _unsupported(port_name: str, provider: str) -> AdapterError:
    return AdapterError(
        f"No {provider!r} adapter for {port_name!r} port (only 'mock' is available)"
    )


@lru_cache
def get_loyalty_port() -> LoyaltyPort:
    provider = _resolve("loyalty", get_settings().loyalty_provider)
    if provider == "mock":
        return MockLoyaltyAdapter()
    raise _unsupported("loyalty", provider)


@lru_cache
def get_cashless_port() -> CashlessPort:
    provider = _resolve("cashless", get_settings().cashless_provider)
    if provider == "mock":
        return MockCashlessAdapter()
    raise _unsupported("cashless", provider)


@lru_cache
def get_digital_key_port() -> DigitalKeyPort:
    provider = _resolve("digital_key", get_settings().digital_key_provider)
    if provider == "mock":
        return MockDigitalKeyAdapter()
    raise _unsupported("digital_key", provider)


@lru_cache
def get_kyc_port() -> KycPort:
    provider = _resolve("kyc", get_settings().kyc_provider)
    if provider == "mock":
        return MockKycAdapter()
    raise _unsupported("kyc", provider)


@lru_cache
def get_geo_port() -> GeoPort:
    provider = _resolve("geo", get_settings().geo_provider)
    if provider == "mock":
        return MockGeoAdapter()
    raise _unsupported("geo", provider)


@lru_cache
def get_payment_port() -> PaymentPort:
    provider = _resolve("payment", get_settings().payment_provider)
    if provider == "mock":
        return MockPaymentAdapter()
    raise _unsupported("payment", provider)


@lru_cache
def get_push_port() -> PushPort:
    provider = _resolve("push", get_settings().push_provider)
    if provider == "mock":
        return MockPushAdapter()
    raise _unsupported("push", provider)


@lru_cache
def get_chat_port() -> ChatPort:
    provider = _resolve("chat", get_settings().chat_provider)
    if provider == "mock":
        return MockChatAdapter()
    raise _unsupported("chat", provider)


@lru_cache
def get_weather_port() -> WeatherPort:
    """WeatherPort behind a 30-min cache; ``real`` = Open-Meteo (keyless)."""
    settings = get_settings()
    provider = _resolve("weather", settings.weather_provider)
    inner: WeatherPort
    if provider == "mock":
        inner = MockWeatherAdapter()
    elif provider in {"real", "open-meteo", "live", "sandbox"}:
        inner = OpenMeteoWeatherAdapter()
    else:
        raise AdapterError(
            f"No {provider!r} adapter for 'weather' port ('mock' and 'real' are available)"
        )
    return CachingWeatherAdapter(inner, cache=get_cache(), ttl_s=settings.weather_cache_ttl_s)


@lru_cache
def get_travel_port() -> TravelPort:
    """TravelPort behind a 5-min cache; ``real`` = OSRM with haversine-model fallback."""
    settings = get_settings()
    provider = _resolve("travel", settings.travel_provider)
    inner: TravelPort
    if provider == "mock":
        inner = MockTravelAdapter()
    elif provider in {"real", "osrm", "live", "sandbox"}:
        inner = OsrmTravelAdapter()
    else:
        raise AdapterError(
            f"No {provider!r} adapter for 'travel' port ('mock' and 'real' are available)"
        )
    return CachingTravelAdapter(inner, cache=get_cache(), ttl_s=settings.travel_cache_ttl_s)
