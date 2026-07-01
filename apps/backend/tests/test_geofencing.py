"""Geofencing trigger engine: dwell threshold, consent, quiet hours, frequency cap.

Includes the Steakhouse 10-minute dwell scenario firing exactly one capped, consented push.
"""

from __future__ import annotations

from datetime import UTC, datetime

from httpx import AsyncClient

from ._helpers import admin_headers, create_player, create_tenant, unique


async def _published_offer(api: AsyncClient, admin: dict[str, str]) -> str:
    created = await api.post("/api/v1/offers", headers=admin, json={"title": "Steakhouse promo X"})
    oid = created.json()["id"]
    await api.post(f"/api/v1/offers/{oid}/publish", headers=admin)
    return oid


async def _zone(api: AsyncClient, admin: dict[str, str], name: str) -> str:
    z = await api.post(
        "/api/v1/geo/zones",
        headers=admin,
        json={
            "name": name,
            "type": "gps",
            "center_lat": 36.1,
            "center_lng": -115.1,
            "radius_m": 50,
        },
    )
    return z.json()["id"]


async def _consented_player(api: AsyncClient, tenant_id: object) -> dict[str, str]:
    email = f"{unique('p')}@example.com"
    await create_player(tenant_id, email, password="pw")  # type: ignore[arg-type]
    token = (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "pw"},
            headers={"X-Tenant": str(tenant_id)},
        )
    ).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    await api.post(
        "/api/v1/me/devices", headers=auth, json={"platform": "ios", "push_token": unique("tok")}
    )
    await api.post("/api/v1/geo/consent", headers=auth, json={"granted": True})
    return auth


async def test_steakhouse_dwell_fires_exactly_once(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    offer_id = await _published_offer(api, admin)
    zone_id = await _zone(api, admin, "Steakhouse")

    await api.post(
        "/api/v1/geo/triggers",
        headers=admin,
        json={
            "zone_id": zone_id,
            "name": "Steakhouse dwell",
            "event": "dwell",
            "dwell_seconds": 600,
            "offer_id": offer_id,
            "frequency_cap_per_day": 1,
        },
    )

    auth = await _consented_player(api, tenant.id)

    first = await api.post(
        "/api/v1/geo/events",
        headers=auth,
        json={"zone_id": zone_id, "event": "dwell", "dwell_seconds": 600},
    )
    assert first.json()["results"][0]["result"] == "dispatched"

    # Same day, second qualifying dwell -> capped (max 1/day). Exactly one push total.
    second = await api.post(
        "/api/v1/geo/events",
        headers=auth,
        json={"zone_id": zone_id, "event": "dwell", "dwell_seconds": 700},
    )
    assert second.json()["results"][0]["result"] == "frequency_capped"


async def test_dwell_threshold_not_met(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    offer_id = await _published_offer(api, admin)
    zone_id = await _zone(api, admin, "Steakhouse")
    await api.post(
        "/api/v1/geo/triggers",
        headers=admin,
        json={
            "zone_id": zone_id,
            "name": "dwell",
            "event": "dwell",
            "dwell_seconds": 600,
            "offer_id": offer_id,
        },
    )
    auth = await _consented_player(api, tenant.id)

    resp = await api.post(
        "/api/v1/geo/events",
        headers=auth,
        json={"zone_id": zone_id, "event": "dwell", "dwell_seconds": 120},
    )
    assert resp.json()["results"][0]["result"] == "dwell_not_met"


async def test_consent_required(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    offer_id = await _published_offer(api, admin)
    zone_id = await _zone(api, admin, "Bar")
    await api.post(
        "/api/v1/geo/triggers",
        headers=admin,
        json={"zone_id": zone_id, "name": "enter", "event": "enter", "offer_id": offer_id},
    )
    # Player without consent (no /geo/consent call).
    email = f"{unique('p')}@example.com"
    await create_player(tenant.id, email, password="pw")
    token = (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "pw"},
            headers={"X-Tenant": str(tenant.id)},
        )
    ).json()["access_token"]

    resp = await api.post(
        "/api/v1/geo/events",
        headers={"Authorization": f"Bearer {token}"},
        json={"zone_id": zone_id, "event": "enter"},
    )
    assert resp.json()["results"][0]["result"] == "no_consent"


async def test_quiet_hours_enforced(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    offer_id = await _published_offer(api, admin)
    zone_id = await _zone(api, admin, "Lounge")

    hour = datetime.now(UTC).hour
    await api.post(
        "/api/v1/geo/triggers",
        headers=admin,
        json={
            "zone_id": zone_id,
            "name": "enter",
            "event": "enter",
            "offer_id": offer_id,
            "quiet_hours_start": hour,
            "quiet_hours_end": (hour + 1) % 24,
        },
    )
    auth = await _consented_player(api, tenant.id)

    resp = await api.post(
        "/api/v1/geo/events", headers=auth, json={"zone_id": zone_id, "event": "enter"}
    )
    assert resp.json()["results"][0]["result"] == "quiet_hours"
