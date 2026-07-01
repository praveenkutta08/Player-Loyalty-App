"""Notifications: segmentation, delivery records, deep-link payloads, schedule respected."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from ._helpers import admin_headers, create_player, create_tenant, unique


async def _player_with_device(api: AsyncClient, tenant_id: object, segment: str) -> str:
    email = f"{unique('p')}@example.com"
    await create_player(tenant_id, email, password="pw", segment=segment)  # type: ignore[arg-type]
    token = (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "pw"},
            headers={"X-Tenant": str(tenant_id)},
        )
    ).json()["access_token"]
    await api.post(
        "/api/v1/me/devices",
        headers={"Authorization": f"Bearer {token}"},
        json={"platform": "ios", "push_token": f"tok-{unique('d')}"},
    )
    return token


async def test_segmented_send_records_deliveries(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)

    await _player_with_device(api, tenant.id, "vip")
    await _player_with_device(api, tenant.id, "vip")
    await _player_with_device(api, tenant.id, "gold")  # should NOT receive a vip campaign

    composed = await api.post(
        "/api/v1/notifications",
        headers=admin,
        json={
            "title": "VIP night",
            "body": "Join us",
            "segment": "vip",
            "deep_link": {"type": "offer", "id": "abc"},
        },
    )
    assert composed.status_code == 201
    nid = composed.json()["id"]

    sent = await api.post(f"/api/v1/notifications/{nid}/send", headers=admin)
    assert sent.status_code == 200
    result = sent.json()
    assert result["total"] == 2  # only the two vip players targeted
    assert result["delivered"] == 2  # both have devices

    deliveries = (await api.get(f"/api/v1/notifications/{nid}/deliveries", headers=admin)).json()
    assert len(deliveries) == 2


async def test_future_scheduled_send_is_refused(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    future = (datetime.now(UTC) + timedelta(days=1)).isoformat()

    composed = await api.post(
        "/api/v1/notifications",
        headers=admin,
        json={"title": "Later", "body": "Soon", "schedule_at": future},
    )
    assert composed.json()["status"] == "scheduled"
    nid = composed.json()["id"]

    sent = await api.post(f"/api/v1/notifications/{nid}/send", headers=admin)
    assert sent.status_code == 409  # schedule respected
