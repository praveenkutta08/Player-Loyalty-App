"""Digital key: issued only for a valid hotel reservation; unlock success/failure states."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from ._helpers import create_tenant, player_token


async def _book(api: AsyncClient, auth: dict[str, str], res_type: str) -> str:
    start = datetime.now(UTC) - timedelta(hours=1)
    end = datetime.now(UTC) + timedelta(days=1)
    resp = await api.post(
        "/api/v1/app/reservations",
        headers=auth,
        json={"type": res_type, "start_at": start.isoformat(), "end_at": end.isoformat()},
    )
    return resp.json()["id"]


async def test_key_issued_for_hotel_and_unlock_states(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    hotel_res = await _book(api, auth, "hotel")
    issued = await api.post(
        "/api/v1/keys", headers=auth, json={"reservation_id": hotel_res, "room": "1207"}
    )
    assert issued.status_code == 200
    key_id = issued.json()["id"]
    assert issued.json()["status"] == "active"

    unlock = await api.post(
        f"/api/v1/keys/{key_id}/unlock", headers=auth, json={"door_id": "door-1"}
    )
    assert unlock.status_code == 200
    assert unlock.json()["unlocked"] is True

    # After revoke, unlock fails.
    await api.post(f"/api/v1/keys/{key_id}/revoke", headers=auth)
    failed = await api.post(
        f"/api/v1/keys/{key_id}/unlock", headers=auth, json={"door_id": "door-1"}
    )
    assert failed.status_code == 409


async def test_key_requires_hotel_reservation(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    dining_res = await _book(api, auth, "dining")
    resp = await api.post(
        "/api/v1/keys", headers=auth, json={"reservation_id": dining_res, "room": "1207"}
    )
    assert resp.status_code == 409
