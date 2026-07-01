"""Admin auth: login, /me, refresh rotation, and permission enforcement."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import create_admin, unique


async def test_admin_login_and_me(api: AsyncClient) -> None:
    email = f"{unique('super')}@example.com"
    await create_admin(email, "pw-secret", "super_admin")

    resp = await api.post(
        "/api/v1/auth/admin/login", json={"email": email, "password": "pw-secret"}
    )
    assert resp.status_code == 200
    tokens = resp.json()
    assert tokens["token_type"] == "bearer"

    me = await api.get(
        "/api/v1/auth/admin/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert me.status_code == 200
    body = me.json()
    assert "super_admin" in body["roles"]
    assert "tenants:read" in body["permissions"]
    assert body["allowed_tenant_ids"] is None  # global super-admin is unrestricted


async def test_admin_bad_password_rejected(api: AsyncClient) -> None:
    email = f"{unique('admin')}@example.com"
    await create_admin(email, "right-pw", "tenant_admin")

    resp = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "wrong-pw"})
    assert resp.status_code == 401
    assert resp.headers["content-type"].startswith("application/problem+json")


async def test_refresh_rotation_invalidates_old_token(api: AsyncClient) -> None:
    email = f"{unique('super')}@example.com"
    await create_admin(email, "pw", "super_admin")
    login = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    old_refresh = login.json()["refresh_token"]

    rotated = await api.post("/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh})
    assert rotated.status_code == 200
    assert rotated.json()["access_token"]

    # The old refresh token must no longer work after rotation.
    reused = await api.post("/api/v1/auth/admin/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


async def test_require_permission_blocks_marketer_from_tenants_read(api: AsyncClient) -> None:
    # Marketer/Editor lacks tenants:read per Appendix C.
    email = f"{unique('mkt')}@example.com"
    await create_admin(email, "pw", "marketer_editor")
    login = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    token = login.json()["access_token"]

    resp = await api.get("/api/v1/tenants", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403
    assert resp.headers["content-type"].startswith("application/problem+json")
