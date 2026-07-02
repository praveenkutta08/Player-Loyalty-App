"""Redis-backed rate limiting with in-memory fallback (audit H4).

Fixed-window counters keyed per endpoint scope: one bucket per client IP and (when known) one
per identifier (email, scoped by tenant). Redis (already in the stack) makes the limits hold
across processes; if Redis is unreachable the limiter degrades to per-process in-memory windows
with a one-time warning rather than blocking all auth.

Auth endpoints call :func:`enforce_auth_rate_limit` first thing; exceeding a bucket raises a
429 problem+json with ``Retry-After``. Disable wholesale with ``RATE_LIMIT_ENABLED=0``
(the test suite does; dedicated rate-limit tests re-enable it explicitly).
"""

from __future__ import annotations

import time
from typing import Any

from fastapi import Request

from .errors import ProblemException
from .logging import get_logger
from .settings import get_settings

logger = get_logger("ratelimit")

_PREFIX = "rl:"


class _MemoryWindows:
    """Per-process fixed windows — fallback when Redis is unavailable."""

    def __init__(self) -> None:
        self._hits: dict[str, tuple[float, int]] = {}

    def hit(self, key: str, window_s: int) -> tuple[int, int]:
        now = time.monotonic()
        start, count = self._hits.get(key, (now, 0))
        if now - start >= window_s:
            start, count = now, 0
        count += 1
        self._hits[key] = (start, count)
        return count, max(1, int(window_s - (now - start)) or 1)

    def peek(self, key: str, window_s: int) -> int:
        now = time.monotonic()
        start, count = self._hits.get(key, (now, 0))
        if now - start >= window_s:
            return 0
        return count


class RateLimiter:
    """Fixed-window counter store: Redis when reachable, in-memory otherwise."""

    def __init__(self) -> None:
        self._redis: Any | None = None
        self._redis_failed = False
        self._memory = _MemoryWindows()

    def _client(self) -> Any | None:
        if self._redis_failed:
            return None
        if self._redis is None:
            try:
                import redis.asyncio as aioredis

                self._redis = aioredis.from_url(
                    get_settings().redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1,
                    socket_timeout=1,
                )
            except Exception:  # pragma: no cover - import/config failure
                self._mark_failed()
                return None
        return self._redis

    def _mark_failed(self) -> None:
        if not self._redis_failed:
            self._redis_failed = True
            logger.warning(
                "ratelimit_redis_unavailable",
                detail="falling back to per-process in-memory rate limiting",
            )

    async def hit(self, key: str, window_s: int) -> tuple[int, int]:
        """Record a hit; return (count_in_window, seconds_until_reset)."""
        client = self._client()
        if client is not None:
            try:
                count = int(await client.incr(_PREFIX + key))
                if count == 1:
                    await client.expire(_PREFIX + key, window_s)
                ttl = int(await client.ttl(_PREFIX + key))
                return count, max(1, ttl if ttl > 0 else window_s)
            except Exception:
                self._mark_failed()
        return self._memory.hit(key, window_s)

    async def peek(self, key: str, window_s: int) -> int:
        """Current count in the window without recording a hit."""
        client = self._client()
        if client is not None:
            try:
                value = await client.get(_PREFIX + key)
                return int(value) if value is not None else 0
            except Exception:
                self._mark_failed()
        return self._memory.peek(key, window_s)


_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    return _limiter


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_auth_rate_limit(
    request: Request, scope: str, identifier: str | None = None
) -> None:
    """Fixed-window limits for an auth endpoint: per client IP and per identifier.

    Raises 429 problem+json with ``Retry-After`` when either bucket overflows.
    """
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return
    limiter = get_rate_limiter()
    window = settings.rate_limit_auth_window_s

    ip_count, ip_retry = await limiter.hit(f"{scope}:ip:{_client_ip(request)}", window)
    if ip_count > settings.rate_limit_auth_per_ip:
        _raise_429(ip_retry)
    if identifier is not None:
        id_count, id_retry = await limiter.hit(f"{scope}:id:{identifier.lower()}", window)
        if id_count > settings.rate_limit_auth_per_identifier:
            _raise_429(id_retry)


async def record_login_failure(identifier: str, scope: str = "login_fail") -> None:
    """Count a failed credential check toward the lockout threshold."""
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return
    await get_rate_limiter().hit(f"{scope}:id:{identifier.lower()}", settings.login_lockout_s)


async def enforce_login_backoff(identifier: str, scope: str = "login_fail") -> None:
    """429 when an identifier has exceeded the failed-login threshold within the lockout window."""
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return
    failures = await get_rate_limiter().peek(
        f"{scope}:id:{identifier.lower()}", settings.login_lockout_s
    )
    if failures >= settings.login_max_failures:
        _raise_429(settings.login_lockout_s, detail="Too many failed login attempts.")


def _raise_429(retry_after: int, detail: str | None = None) -> None:
    raise ProblemException(
        429,
        "Too many requests",
        detail=detail or "Rate limit exceeded — retry later.",
        headers={"Retry-After": str(retry_after)},
    )
