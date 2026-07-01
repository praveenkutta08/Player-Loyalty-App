"""Offers/promotions: segment targeting, idempotent redemption, per-kind permissions."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import admin_headers, create_admin, create_player, create_tenant, unique


async def test_targeting_and_idempotent_redemption(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)

    email = f"{unique('vip')}@example.com"
    await create_player(tenant.id, email, password="pw", segment="vip")
    player_token = (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "pw"},
            headers={"X-Tenant": str(tenant.id)},
        )
    ).json()["access_token"]
    player_auth = {"Authorization": f"Bearer {player_token}"}

    async def make_offer(title: str, segment: str | None) -> str:
        created = await api.post(
            "/api/v1/offers", headers=admin, json={"title": title, "segment": segment}
        )
        oid = created.json()["id"]
        await api.post(f"/api/v1/offers/{oid}/publish", headers=admin)
        return oid

    all_id = await make_offer("Everyone", "all")
    vip_id = await make_offer("VIP only", "vip")
    await make_offer("Gold only", "gold")

    visible = {o["id"] for o in (await api.get("/api/v1/app/offers", headers=player_auth)).json()}
    assert all_id in visible
    assert vip_id in visible
    assert len(visible) == 2  # gold offer excluded

    first = await api.post(f"/api/v1/app/offers/{all_id}/redeem", headers=player_auth)
    assert first.status_code == 200
    # Double-redeem is idempotent -> same ledger row.
    second = await api.post(f"/api/v1/app/offers/{all_id}/redeem", headers=player_auth)
    assert second.json()["id"] == first.json()["id"]


async def test_promotions_group_and_permissions(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)

    created = await api.post("/api/v1/promotions", headers=admin, json={"title": "Weekend x2"})
    assert created.status_code == 201
    pid = created.json()["id"]
    assert created.json()["kind"] == "promotion"
    await api.post(f"/api/v1/promotions/{pid}/publish", headers=admin)

    # A marketer assigned to the tenant can create but not delete offers (Appendix C).
    email = f"{unique('mkt')}@example.com"
    await create_admin(email, "pw", "marketer_editor", allowed_tenant_ids=[tenant.id])
    token = (
        await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    ).json()["access_token"]
    mkt = {"Authorization": f"Bearer {token}", "X-Tenant": str(tenant.id)}

    offer = await api.post("/api/v1/offers", headers=mkt, json={"title": "Free spin"})
    assert offer.status_code == 201
    assert (
        await api.delete(f"/api/v1/offers/{offer.json()['id']}", headers=mkt)
    ).status_code == 403
