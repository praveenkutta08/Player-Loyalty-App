"""End-to-end vertical slice (P5.2): the core promise proven admin -> API -> app in one tenant.

Automates the three flows the mobile app consumes live from the manifest/API:
  1. Theme change in admin re-themes the app (manifest theme + version bump) — no rebuild.
  2. Offer published in admin appears and redeems for the player.
  3. Push composed in admin sends and carries its deep link to the player's device.

The manual, on-device checklist (theme colors, redemption UI, deep-link navigation) lives in
docs/E2E_VERTICAL_SLICE.md; this covers everything verifiable at the API boundary.
"""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import admin_headers, create_player, create_tenant, unique


async def _player_with_device(api: AsyncClient, tenant_id: object) -> str:
    email = f"{unique('p')}@example.com"
    await create_player(tenant_id, email, password="pw")  # type: ignore[arg-type]
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


async def test_theme_offer_and_push_flow_admin_to_app(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    player_token = await _player_with_device(api, tenant.id)
    player = {"Authorization": f"Bearer {player_token}"}
    public = {"X-Tenant": str(tenant.id)}

    # ---- 1. Theme: admin change re-themes the app via the manifest (no rebuild) --------------
    before = (await api.get("/api/v1/config/manifest", headers=public)).json()
    # Since P7.2 the manifest always resolves the typography pairing into the theme.
    assert "color" not in before["theme"]
    base_version = before["version"]

    theme = await api.post(
        "/api/v1/config/themes",
        headers=admin,
        json={"name": "Gold", "tokens": {"color": {"gold": "#E6B450"}}, "is_active": True},
    )
    assert theme.status_code == 201

    after = (await api.get("/api/v1/config/manifest", headers=public)).json()
    assert after["theme"]["color"] == {"gold": "#E6B450"}
    assert after["version"] > base_version  # bumped -> the app cache-busts + re-themes live

    # ---- 2. Offer: admin publish -> appears + redeems in the app ------------------------------
    created = await api.post(
        "/api/v1/offers", headers=admin, json={"title": "Free spin", "segment": "all"}
    )
    assert created.status_code == 201
    offer_id = created.json()["id"]

    # Unpublished offers are invisible to the player.
    hidden = {o["id"] for o in (await api.get("/api/v1/app/offers", headers=player)).json()}
    assert offer_id not in hidden

    await api.post(f"/api/v1/offers/{offer_id}/publish", headers=admin)
    visible = {o["id"] for o in (await api.get("/api/v1/app/offers", headers=player)).json()}
    assert offer_id in visible

    first = await api.post(f"/api/v1/app/offers/{offer_id}/redeem", headers=player)
    assert first.status_code == 200
    # Idempotent redemption -> same ledger row on retry.
    second = await api.post(f"/api/v1/app/offers/{offer_id}/redeem", headers=player)
    assert second.json()["id"] == first.json()["id"]

    # ---- 3. Push: admin send -> delivered with the offer deep link ---------------------------
    composed = await api.post(
        "/api/v1/notifications",
        headers=admin,
        json={
            "title": "Your free spin is ready",
            "body": "Tap to view your offer.",
            "deep_link": {"type": "offer", "id": offer_id},
        },
    )
    assert composed.status_code == 201
    assert composed.json()["deep_link"] == {"type": "offer", "id": offer_id}
    nid = composed.json()["id"]

    sent = await api.post(f"/api/v1/notifications/{nid}/send", headers=admin)
    assert sent.status_code == 200
    assert sent.json()["delivered"] >= 1  # the player's registered device received it

    deliveries = (await api.get(f"/api/v1/notifications/{nid}/deliveries", headers=admin)).json()
    assert len(deliveries) >= 1
