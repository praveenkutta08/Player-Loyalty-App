"""Small async TTL cache behind a port (P6.1) — Redis in dev/prod, in-memory for tests.

The concierge external-context adapters (weather 30 min, travel 5 min) cache through this.
``RedisCache`` degrades gracefully: if Redis is unreachable every ``get`` is a miss and every
``set`` a no-op (warned once), so a missing Redis never breaks a request — it only uncaches it.
"""

from __future__ import annotations

import time
from collections.abc import Callable
from functools import lru_cache
from typing import Protocol, runtime_checkable

import structlog

from .settings import get_settings

logger = structlog.get_logger(__name__)


@runtime_checkable
class CachePort(Protocol):
    async def get(self, key: str) -> str | None: ...

    async def set(self, key: str, value: str, ttl_s: int) -> None: ...


class InMemoryCache:
    """Process-local TTL cache. The clock is injectable so tests can advance time."""

    def __init__(self, *, clock: Callable[[], float] | None = None) -> None:
        self._data: dict[str, tuple[float, str]] = {}
        self._clock = clock or time.monotonic

    async def get(self, key: str) -> str | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if self._clock() >= expires_at:
            self._data.pop(key, None)
            return None
        return value

    async def set(self, key: str, value: str, ttl_s: int) -> None:
        self._data[key] = (self._clock() + ttl_s, value)


class RedisCache:
    """redis.asyncio-backed cache; connection failures degrade to cache misses."""

    def __init__(self, url: str) -> None:
        self._url = url
        self._client = None
        self._warned = False

    def _get_client(self):  # type: ignore[no-untyped-def]  # redis types are runtime-optional
        if self._client is None:
            import redis.asyncio as aioredis

            self._client = aioredis.from_url(
                self._url,
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
        return self._client

    def _warn_once(self, exc: Exception) -> None:
        if not self._warned:
            self._warned = True
            logger.warning("cache.redis_unavailable", url=self._url, error=str(exc))

    async def get(self, key: str) -> str | None:
        try:
            value = await self._get_client().get(key)
        except Exception as exc:  # noqa: BLE001 — any transport failure is a miss
            self._warn_once(exc)
            return None
        return value if isinstance(value, str) else None

    async def set(self, key: str, value: str, ttl_s: int) -> None:
        try:
            await self._get_client().set(key, value, ex=ttl_s)
        except Exception as exc:  # noqa: BLE001
            self._warn_once(exc)


@lru_cache
def get_cache() -> CachePort:
    """Cached cache-port factory: ``CACHE_BACKEND=redis|memory`` (default redis)."""
    settings = get_settings()
    if settings.cache_backend.lower() == "memory":
        return InMemoryCache()
    return RedisCache(settings.redis_url)
