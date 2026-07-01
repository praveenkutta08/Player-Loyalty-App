"""CMS content: author -> publish -> appears in app list; manifest version bumps; media presign."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import create_admin, create_player, create_tenant, unique


async def _admin_headers(api: AsyncClient, tenant_id: str) -> dict[str, str]:
    email = f"{unique('super')}@example.com"
    await create_admin(email, "pw", "super_admin")
    token = (
        await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}", "X-Tenant": tenant_id}


async def _player_token(api: AsyncClient, tenant_id: str, email: str) -> str:
    await create_player(tenant_id, email, password="pw")  # type: ignore[arg-type]
    return (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "pw"},
            headers={"X-Tenant": tenant_id},
        )
    ).json()["access_token"]


async def test_author_publish_appears_and_bumps_manifest(api: AsyncClient) -> None:
    tenant = await create_tenant()
    tid = str(tenant.id)
    admin = await _admin_headers(api, tid)
    player_token = await _player_token(api, tid, f"{unique('p')}@example.com")
    player_auth = {"Authorization": f"Bearer {player_token}"}

    version_before = (await api.get("/api/v1/config/manifest", headers={"X-Tenant": tid})).json()[
        "version"
    ]

    created = await api.post(
        "/api/v1/content",
        headers=admin,
        json={"content_type": "article", "title": "Welcome", "body": "Hello"},
    )
    assert created.status_code == 201
    item_id = created.json()["id"]

    # Draft is not visible to the app yet.
    assert (await api.get("/api/v1/app/content", headers=player_auth)).json() == []

    published = await api.post(f"/api/v1/content/{item_id}/publish", headers=admin)
    assert published.status_code == 200
    assert published.json()["status"] == "published"

    app_items = (await api.get("/api/v1/app/content", headers=player_auth)).json()
    assert [i["id"] for i in app_items] == [item_id]

    version_after = (await api.get("/api/v1/config/manifest", headers={"X-Tenant": tid})).json()[
        "version"
    ]
    assert version_after > version_before


async def test_media_presign_returns_urls(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await _admin_headers(api, str(tenant.id))

    resp = await api.post(
        "/api/v1/content/media/presign",
        headers=admin,
        json={"filename": "banner.png", "content_type": "image/png"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["upload_url"].startswith("http")
    assert body["media_url"].endswith("banner.png")
    assert "content/" in body["key"]


async def test_content_requires_permission(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email = f"{unique('mkt')}@example.com"
    # Marketer has content:create but is scoped; assign to tenant.
    await create_admin(email, "pw", "marketer_editor", allowed_tenant_ids=[tenant.id])
    token = (
        await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    ).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}", "X-Tenant": str(tenant.id)}

    # Marketer can create/publish content but cannot delete it (per Appendix C).
    created = await api.post(
        "/api/v1/content", headers=headers, json={"content_type": "banner", "title": "x"}
    )
    assert created.status_code == 201
    deleted = await api.delete(f"/api/v1/content/{created.json()['id']}", headers=headers)
    assert deleted.status_code == 403
