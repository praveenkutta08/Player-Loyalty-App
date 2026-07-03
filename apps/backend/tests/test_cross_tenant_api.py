"""Audit M10 — cross-tenant isolation through the REAL API (not just the synthetic RLS table).

A tenant-A admin requesting a tenant-B resource id must get 404/empty, never B's data. These
probes exercise the full request stack (auth -> tenancy dep -> RLS-bound session -> query) so a
regression that drops a tenant filter is caught even though RLS would still block it.
"""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

from ._helpers import admin_headers, create_player, create_tenant, unique


async def _two_tenants(api: AsyncClient) -> tuple:
    """A super-admin plus two tenants; the admin can act as either via X-Tenant."""
    tenant_a = await create_tenant()
    tenant_b = await create_tenant()
    # super_admin (unrestricted) so we can switch X-Tenant between A and B in one identity.
    base = await admin_headers(api)
    a = {**base, "X-Tenant": str(tenant_a.id)}
    b = {**base, "X-Tenant": str(tenant_b.id)}
    return tenant_a, tenant_b, a, b


async def test_offer_ids_do_not_cross_tenants(api: AsyncClient) -> None:
    _ta, _tb, a_headers, b_headers = await _two_tenants(api)

    created = await api.post("/api/v1/offers", headers=b_headers, json={"title": "B-only"})
    assert created.status_code == 201
    b_offer_id = created.json()["id"]

    # Tenant A cannot see B's offer in its list...
    a_list = (await api.get("/api/v1/offers", headers=a_headers)).json()["items"]
    assert all(o["id"] != b_offer_id for o in a_list)

    # ...nor update, publish, or delete it by id (RLS-scoped 404, no data leak).
    upd = await api.put(
        f"/api/v1/offers/{b_offer_id}", headers=a_headers, json={"title": "hijack"}
    )
    assert upd.status_code == 404
    pub = await api.post(f"/api/v1/offers/{b_offer_id}/publish", headers=a_headers)
    assert pub.status_code == 404
    dele = await api.delete(f"/api/v1/offers/{b_offer_id}", headers=a_headers)
    assert dele.status_code == 404

    # B still owns an intact offer.
    b_list = (await api.get("/api/v1/offers", headers=b_headers)).json()["items"]
    assert any(o["id"] == b_offer_id and o["title"] == "B-only" for o in b_list)


async def test_reward_ids_do_not_cross_tenants(api: AsyncClient) -> None:
    _ta, _tb, a_headers, b_headers = await _two_tenants(api)

    created = await api.post(
        "/api/v1/rewards/admin", headers=b_headers, json={"title": "B mug", "points_cost": 50}
    )
    assert created.status_code == 201
    b_reward_id = created.json()["id"]

    upd = await api.put(
        f"/api/v1/rewards/admin/{b_reward_id}", headers=a_headers, json={"title": "hijack"}
    )
    assert upd.status_code == 404
    dele = await api.delete(f"/api/v1/rewards/admin/{b_reward_id}", headers=a_headers)
    assert dele.status_code == 404

    a_list = (await api.get("/api/v1/rewards/admin", headers=a_headers)).json()["items"]
    assert all(r["id"] != b_reward_id for r in a_list)


async def test_player_records_do_not_cross_tenants(api: AsyncClient) -> None:
    tenant_a, tenant_b, a_headers, b_headers = await _two_tenants(api)

    email = f"{unique('bplayer')}@example.com"
    player_b = await create_player(tenant_b.id, email, password="pw")

    # Lookup by email under tenant A returns 404 even though the player exists (in B).
    lookup = await api.get("/api/v1/players/lookup", headers=a_headers, params={"email": email})
    assert lookup.status_code == 404

    # Direct rg-flags mutation on B's player id under tenant A is 404, not a silent write.
    patch = await api.patch(
        f"/api/v1/players/{player_b.id}/rg-flags",
        headers=a_headers,
        json={"self_exclusion": True},
    )
    assert patch.status_code == 404

    # Under tenant B the same lookup resolves.
    ok = await api.get("/api/v1/players/lookup", headers=b_headers, params={"email": email})
    assert ok.status_code == 200
    assert ok.json()["email"] == email


@pytest.mark.parametrize("resource", ["offers", "rewards/admin"])
async def test_random_foreign_id_is_404(api: AsyncClient, resource: str) -> None:
    """A random UUID (another tenant's or a nonexistent id) never returns data."""
    _ta, _tb, a_headers, _b = await _two_tenants(api)
    resp = await api.put(
        f"/api/v1/{resource}/{uuid.uuid4()}", headers=a_headers, json={"title": "x"}
    )
    assert resp.status_code == 404
