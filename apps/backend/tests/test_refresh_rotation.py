"""Audit M1 — refresh rotation is atomic; reuse revokes the family; logout works."""

from __future__ import annotations

import asyncio

from httpx import AsyncClient

from ._helpers import create_admin, unique


async def _login(api: AsyncClient, email: str, password: str = "pw") -> str:
    """Log in and return the refresh token from the httpOnly cookie (H5 — it is no longer in the
    response body). Tests then pass it explicitly in the body, which takes precedence over the
    client jar's cookie so a specific (possibly already-rotated) token can be replayed."""
    resp = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    refresh = resp.cookies.get("admin_refresh")
    assert refresh, "login must set the admin_refresh cookie"
    return refresh


async def test_rotation_revokes_old_and_issues_new(api: AsyncClient) -> None:
    email = f"{unique('rot')}@example.com"
    await create_admin(email, "pw", "tenant_admin")
    old_refresh = await _login(api, email)

    rotated = await api.post(
        "/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}
    )
    assert rotated.status_code == 200
    new_refresh = rotated.cookies.get("admin_refresh")
    assert new_refresh and new_refresh != old_refresh

    # The rotated (old) token is single-use.
    reused = await api.post(
        "/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}
    )
    assert reused.status_code == 401


async def test_reuse_detection_revokes_the_whole_family(api: AsyncClient) -> None:
    email = f"{unique('reuse')}@example.com"
    await create_admin(email, "pw", "tenant_admin")
    old_refresh = await _login(api, email)

    # Rotate once — old token now revoked, new token live.
    rotated = await api.post(
        "/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}
    )
    new_refresh = rotated.cookies.get("admin_refresh")

    # Replaying the OLD (already-rotated) token is treated as theft: 401 + family revoked.
    replay = await api.post(
        "/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}
    )
    assert replay.status_code == 401

    # ...so even the previously-valid NEW token no longer works.
    after = await api.post(
        "/api/v1/auth/admin/refresh", json={"refresh_token": new_refresh}
    )
    assert after.status_code == 401


async def test_concurrent_rotation_only_one_wins(api: AsyncClient) -> None:
    email = f"{unique('conc')}@example.com"
    await create_admin(email, "pw", "tenant_admin")
    old_refresh = await _login(api, email)

    r1, r2 = await asyncio.gather(
        api.post("/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}),
        api.post("/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}),
    )
    statuses = sorted([r1.status_code, r2.status_code])
    # Atomic UPDATE ... WHERE revoked_at IS NULL: exactly one rotates, the other is rejected.
    assert statuses == [200, 401]


async def test_logout_revokes_refresh(api: AsyncClient) -> None:
    email = f"{unique('out')}@example.com"
    await create_admin(email, "pw", "tenant_admin")
    old_refresh = await _login(api, email)

    out = await api.post(
        "/api/v1/auth/admin/logout", json={"refresh_token": old_refresh}
    )
    assert out.status_code == 204

    # The refresh token no longer works after logout.
    refreshed = await api.post(
        "/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh}
    )
    assert refreshed.status_code == 401

    # Logout is idempotent — a second call (or an unknown token) still 204s.
    again = await api.post(
        "/api/v1/auth/admin/logout", json={"refresh_token": old_refresh}
    )
    assert again.status_code == 204
