"""Account/loyalty: /me, points, activity, device registration, KYC (via mock ports)."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import create_tenant, player_token


async def test_me_points_activity(api: AsyncClient) -> None:
    tenant = await create_tenant()
    token = await player_token(api, tenant.id)
    auth = {"Authorization": f"Bearer {token}"}

    me = await api.get("/api/v1/me", headers=auth)
    assert me.status_code == 200
    body = me.json()
    assert body["tenant_id"] == str(tenant.id)
    assert body["kyc_status"] == "unstarted"
    assert "tier" in body and isinstance(body["points"], int)

    points = await api.get("/api/v1/account/points", headers=auth)
    assert points.status_code == 200
    assert "tier" in points.json()

    activity = await api.get("/api/v1/account/activity", headers=auth)
    assert activity.status_code == 200
    feed = activity.json()
    assert len(feed) >= 1
    assert {"win", "loss", "earn"} & {a["type"] for a in feed}


async def test_device_registration(api: AsyncClient) -> None:
    tenant = await create_tenant()
    token = await player_token(api, tenant.id)
    auth = {"Authorization": f"Bearer {token}"}

    resp = await api.post(
        "/api/v1/me/devices",
        headers=auth,
        json={"platform": "ios", "push_token": "device-token-123"},
    )
    assert resp.status_code == 200
    assert resp.json()["push_token"] == "device-token-123"

    # Re-registering the same token is an upsert (no duplicate / no error).
    again = await api.post(
        "/api/v1/me/devices",
        headers=auth,
        json={"platform": "ios", "push_token": "device-token-123"},
    )
    assert again.status_code == 200


async def test_kyc_start_updates_status(api: AsyncClient) -> None:
    tenant = await create_tenant()
    token = await player_token(api, tenant.id)
    auth = {"Authorization": f"Bearer {token}"}

    resp = await api.post("/api/v1/account/kyc/start", headers=auth)
    assert resp.status_code == 200
    # Mock KYC approves ordinary names.
    assert resp.json()["kyc_status"] == "approved"
    assert (await api.get("/api/v1/me", headers=auth)).json()["kyc_status"] == "approved"
