"""Rewards marketplace: redeem deducts points+stock once; insufficient / out-of-stock paths."""

from __future__ import annotations

from app.adapters.factory import get_loyalty_port
from httpx import AsyncClient

from ._helpers import admin_headers, create_player, create_tenant, unique


async def _player_with_points(api: AsyncClient, tenant_id: object, points: int) -> dict[str, str]:
    email = f"{unique('p')}@example.com"
    player = await create_player(tenant_id, email, password="pw")  # type: ignore[arg-type]
    if points:
        await get_loyalty_port().earn(str(player.id), points, "seed")
    token = (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": email, "password": "pw"},
            headers={"X-Tenant": str(tenant_id)},
        )
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def _reward(api: AsyncClient, admin: dict[str, str], **fields: object) -> str:
    created = await api.post("/api/v1/rewards/admin", headers=admin, json=fields)
    rid = created.json()["id"]
    await api.put(f"/api/v1/rewards/admin/{rid}", headers=admin, json={"status": "published"})
    return rid


async def test_redeem_deducts_points_and_stock_once(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = await _player_with_points(api, tenant.id, 500)
    rid = await _reward(api, admin, title="Cap", points_cost=100, stock=5)

    first = await api.post(
        f"/api/v1/rewards/{rid}/redeem", headers={**auth, "Idempotency-Key": "k1"}
    )
    assert first.status_code == 200
    assert first.json()["points_spent"] == 100

    # Idempotent: same key -> same redemption, no extra deduction.
    again = await api.post(
        f"/api/v1/rewards/{rid}/redeem", headers={**auth, "Idempotency-Key": "k1"}
    )
    assert again.json()["id"] == first.json()["id"]

    points = (await api.get("/api/v1/account/points", headers=auth)).json()["points"]
    assert points == 400  # 500 - 100, once

    reward = next(
        r for r in (await api.get("/api/v1/rewards", headers=auth)).json() if r["id"] == rid
    )
    assert reward["stock"] == 4  # decremented once

    history = (await api.get("/api/v1/me/redemptions", headers=auth)).json()["items"]
    assert len(history) == 1


async def test_insufficient_points(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = await _player_with_points(api, tenant.id, 10)
    rid = await _reward(api, admin, title="Pricey", points_cost=1000, stock=5)

    resp = await api.post(
        f"/api/v1/rewards/{rid}/redeem", headers={**auth, "Idempotency-Key": "k1"}
    )
    assert resp.status_code == 409


async def test_out_of_stock(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = await _player_with_points(api, tenant.id, 500)
    rid = await _reward(api, admin, title="Sold out", points_cost=100, stock=0)

    resp = await api.post(
        f"/api/v1/rewards/{rid}/redeem", headers={**auth, "Idempotency-Key": "k1"}
    )
    assert resp.status_code == 409
