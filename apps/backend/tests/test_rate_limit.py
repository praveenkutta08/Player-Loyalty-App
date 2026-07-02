"""Audit H4 — auth rate limiting + OTP brute-force caps.

The suite runs with RATE_LIMIT_ENABLED=0 (conftest); these tests re-enable enforcement on the
cached settings singleton with low limits and unique identifiers so runs don't collide.
"""

from __future__ import annotations

import pytest
from app.core.settings import get_settings
from app.db.session import SessionLocal
from app.modules.players.service import create_player_otp
from app.tenancy.deps import set_tenant_context
from httpx import AsyncClient

from ._helpers import create_player, create_tenant, unique


@pytest.fixture
def rate_limits_on(monkeypatch: pytest.MonkeyPatch):  # type: ignore[no-untyped-def]
    settings = get_settings()
    monkeypatch.setattr(settings, "rate_limit_enabled", True)
    # Per-IP high: every request in the suite shares the test client IP; the per-identifier
    # bucket (unique emails) is what these tests exercise deterministically.
    monkeypatch.setattr(settings, "rate_limit_auth_per_ip", 10_000)
    monkeypatch.setattr(settings, "rate_limit_auth_per_identifier", 3)
    monkeypatch.setattr(settings, "rate_limit_auth_window_s", 60)
    monkeypatch.setattr(settings, "login_max_failures", 3)
    yield settings


async def test_player_login_burst_gets_429_with_retry_after(
    api: AsyncClient, rate_limits_on: object
) -> None:
    tenant = await create_tenant()
    email = f"{unique('burst')}@example.com"
    await create_player(tenant.id, email, password="right-pw")

    statuses = []
    for _ in range(5):
        resp = await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "wrong-pw"},
            headers={"X-Tenant": str(tenant.id)},
        )
        statuses.append(resp.status_code)
    assert statuses[:3] == [401, 401, 401]
    assert statuses[3] == 429 and statuses[4] == 429
    assert "retry-after" in {k.lower() for k in resp.headers}
    assert resp.headers["content-type"].startswith("application/problem+json")


async def test_admin_login_locks_out_after_repeated_failures(
    api: AsyncClient, rate_limits_on: object
) -> None:
    from ._helpers import create_admin

    email = f"{unique('lock')}@example.com"
    await create_admin(email, "correct-pw", "tenant_admin")

    # Stay under the coarse per-identifier bucket; trip the failed-credentials backoff.
    settings = rate_limits_on
    settings.rate_limit_auth_per_identifier = 10_000  # type: ignore[attr-defined]

    for _ in range(3):
        resp = await api.post(
            "/api/v1/auth/admin/login", json={"email": email, "password": "nope"}
        )
        assert resp.status_code == 401
    # Threshold reached: even the CORRECT password is refused during the lockout window.
    locked = await api.post(
        "/api/v1/auth/admin/login", json={"email": email, "password": "correct-pw"}
    )
    assert locked.status_code == 429
    assert "retry-after" in {k.lower() for k in locked.headers}


async def test_otp_is_invalidated_after_max_wrong_attempts(api: AsyncClient) -> None:
    """DB-backed attempt cap — enforced regardless of the rate-limit toggle."""
    tenant = await create_tenant()
    email = f"{unique('otp')}@example.com"
    await create_player(tenant.id, email, password="pw")
    headers = {"X-Tenant": str(tenant.id)}

    async with SessionLocal() as session:
        await set_tenant_context(session, tenant.id)
        code = await create_player_otp(session, tenant.id, email)
        await session.commit()

    max_attempts = get_settings().otp_max_attempts
    for _ in range(max_attempts):
        wrong = await api.post(
            "/api/v1/auth/player/otp/verify",
            json={"email": email, "code": "000000" if code != "000000" else "111111"},
            headers=headers,
        )
        assert wrong.status_code == 401

    # The real code is now dead — the OTP was consumed by the brute-force cap.
    burned = await api.post(
        "/api/v1/auth/player/otp/verify", json={"email": email, "code": code}, headers=headers
    )
    assert burned.status_code == 401

    # Re-requesting issues a fresh code that works.
    async with SessionLocal() as session:
        await set_tenant_context(session, tenant.id)
        fresh = await create_player_otp(session, tenant.id, email)
        await session.commit()
    ok = await api.post(
        "/api/v1/auth/player/otp/verify", json={"email": email, "code": fresh}, headers=headers
    )
    assert ok.status_code == 200
    assert "access_token" in ok.json()
