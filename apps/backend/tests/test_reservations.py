"""Reservations & valet lifecycle transitions (player book/request, admin manage)."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import admin_headers, create_tenant, player_token


async def test_reservation_lifecycle(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    booked = await api.post("/api/v1/app/reservations", headers=auth, json={"type": "dining"})
    assert booked.status_code == 200
    res = booked.json()
    assert res["status"] == "confirmed"
    assert res["external_ref"].startswith("BKG-")
    res_id = res["id"]

    assert (await api.get("/api/v1/app/reservations", headers=auth)).json()[0]["id"] == res_id

    # Admin completes it; then it cannot transition again.
    done = await api.patch(
        f"/api/v1/reservations/{res_id}", headers=admin, json={"status": "completed"}
    )
    assert done.json()["status"] == "completed"
    blocked = await api.patch(
        f"/api/v1/reservations/{res_id}", headers=admin, json={"status": "cancelled"}
    )
    assert blocked.status_code == 409


async def test_valet_lifecycle(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    requested = await api.post("/api/v1/app/valet", headers=auth)
    assert requested.status_code == 200
    valet = requested.json()
    assert valet["status"] == "requested"
    assert valet["ticket_ref"].startswith("VLT-")
    valet_id = valet["id"]

    ready = await api.patch(f"/api/v1/valet/{valet_id}", headers=admin, json={"status": "ready"})
    assert ready.json()["status"] == "ready"
    assert ready.json()["ready_at"] is not None

    delivered = await api.patch(
        f"/api/v1/valet/{valet_id}", headers=admin, json={"status": "delivered"}
    )
    assert delivered.json()["status"] == "delivered"

    # Player can read their valet ticket status.
    assert (await api.get(f"/api/v1/app/valet/{valet_id}", headers=auth)).json()["status"] == (
        "delivered"
    )
