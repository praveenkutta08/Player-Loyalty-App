"""Manifest resolution, version bumping, ETag caching, and permission gating."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import create_admin, create_tenant, unique


async def _admin_token(api: AsyncClient, role_key: str) -> str:
    email = f"{unique(role_key)}@example.com"
    await create_admin(email, "pw", role_key)
    login = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    return login.json()["access_token"]


async def test_manifest_reflects_edits_and_bumps_version(api: AsyncClient) -> None:
    tenant = await create_tenant()
    headers_pub = {"X-Tenant": str(tenant.id)}

    first = await api.get("/api/v1/config/manifest", headers=headers_pub)
    assert first.status_code == 200
    body = first.json()
    assert body["version"] == 1
    assert body["feature_flags"] == {}
    # Since P7.2 the resolved manifest always carries the curated typography pairing's fonts —
    # an otherwise-unthemed tenant gets exactly that overlay.
    assert body["theme"] == {
        "typography": {"fontFamily": {"display": "Bodoni Moda", "sans": "Manrope"}}
    }
    assert body["navigation"]["tabs"]  # default navigation shipped

    token = await _admin_token(api, "super_admin")
    admin_headers = {"Authorization": f"Bearer {token}", "X-Tenant": str(tenant.id)}

    # Toggle a feature flag -> manifest reflects it and version bumps.
    put = await api.put(
        "/api/v1/config",
        headers=admin_headers,
        json={"feature_flags": {"digital_key": True, "cardless": False}},
    )
    assert put.status_code == 200
    assert put.json()["version"] == 2

    after_flag = (await api.get("/api/v1/config/manifest", headers=headers_pub)).json()
    assert after_flag["feature_flags"] == {"digital_key": True, "cardless": False}
    assert after_flag["version"] == 2

    # Create + activate a theme -> manifest theme tokens appear and version bumps again.
    theme = await api.post(
        "/api/v1/config/themes",
        headers=admin_headers,
        json={"name": "Gold", "tokens": {"color": {"gold": "#E6B450"}}, "is_active": True},
    )
    assert theme.status_code == 201

    after_theme = (await api.get("/api/v1/config/manifest", headers=headers_pub)).json()
    assert after_theme["theme"]["color"] == {"gold": "#E6B450"}
    assert after_theme["version"] == 3


async def test_manifest_etag_enables_304(api: AsyncClient) -> None:
    tenant = await create_tenant()
    headers = {"X-Tenant": str(tenant.id)}

    first = await api.get("/api/v1/config/manifest", headers=headers)
    etag = first.headers["ETag"]
    assert etag

    cached = await api.get("/api/v1/config/manifest", headers={**headers, "If-None-Match": etag})
    assert cached.status_code == 304

    # After an edit the version (and thus ETag) changes, so the old ETag no longer matches.
    token = await _admin_token(api, "super_admin")
    await api.put(
        "/api/v1/config",
        headers={"Authorization": f"Bearer {token}", "X-Tenant": str(tenant.id)},
        json={"feature_flags": {"x": True}},
    )
    revalidated = await api.get(
        "/api/v1/config/manifest", headers={**headers, "If-None-Match": etag}
    )
    assert revalidated.status_code == 200
    assert revalidated.headers["ETag"] != etag


async def test_config_and_theme_endpoints_are_permission_gated(api: AsyncClient) -> None:
    tenant = await create_tenant()
    # Assign the marketer to this tenant so we isolate *permission* gating (not tenant scope).
    email = f"{unique('marketer')}@example.com"
    await create_admin(email, "pw", "marketer_editor", allowed_tenant_ids=[tenant.id])
    token = (
        await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Tenant": str(tenant.id)}

    # Marketer/Editor lacks tenant_config permissions entirely.
    assert (await api.get("/api/v1/config", headers=headers)).status_code == 403
    assert (
        await api.put("/api/v1/config", headers=headers, json={"feature_flags": {}})
    ).status_code == 403

    # Marketer/Editor may read branding but not create themes.
    assert (await api.get("/api/v1/config/themes", headers=headers)).status_code == 200
    assert (
        await api.post("/api/v1/config/themes", headers=headers, json={"name": "x", "tokens": {}})
    ).status_code == 403


async def test_manifest_requires_known_tenant(api: AsyncClient) -> None:
    missing = await api.get("/api/v1/config/manifest")
    assert missing.status_code == 400  # X-Tenant required
