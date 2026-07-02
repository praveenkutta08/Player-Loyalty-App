"""Audit H1 — idempotency keys are player-scoped: replay is per player, cross-player reuse 409s."""

from __future__ import annotations

from app.adapters.factory import get_loyalty_port
from httpx import AsyncClient

from ._helpers import admin_headers, create_player, create_tenant, player_token, unique


async def test_wallet_same_player_replays_own_txn(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    first = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "scope-k1"},
        json={"amount_cents": 1500},
    )
    replay = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "scope-k1"},
        json={"amount_cents": 1500},
    )
    assert first.status_code == replay.status_code == 200
    assert replay.json()["id"] == first.json()["id"]


async def test_wallet_cross_player_key_reuse_is_409_without_leak(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth_a = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    auth_b = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    a_txn = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth_a, "Idempotency-Key": "shared-key"},
        json={"amount_cents": 4200},
    )
    assert a_txn.status_code == 200

    b_reuse = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth_b, "Idempotency-Key": "shared-key"},
        json={"amount_cents": 100},
    )
    assert b_reuse.status_code == 409
    body = b_reuse.json()
    # problem+json conflict, with none of player A's transaction data leaking through.
    assert a_txn.json()["id"] not in str(body)
    assert "4200" not in str(body)

    # Player A's balance is untouched and their replay still works.
    a_replay = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth_a, "Idempotency-Key": "shared-key"},
        json={"amount_cents": 4200},
    )
    assert a_replay.json()["id"] == a_txn.json()["id"]


async def test_rewards_cross_player_key_reuse_is_409(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)

    created = await api.post(
        "/api/v1/rewards/admin", headers=admin, json={"title": "Mug", "points_cost": 50, "stock": 5}
    )
    rid = created.json()["id"]
    await api.put(f"/api/v1/rewards/admin/{rid}", headers=admin, json={"status": "published"})

    async def player_auth() -> dict[str, str]:
        email = f"{unique('p')}@example.com"
        player = await create_player(tenant.id, email, password="pw")
        await get_loyalty_port().earn(str(player.id), 500, "seed")
        token = (
            await api.post(
                "/api/v1/auth/player/login",
                json={"email": email, "password": "pw"},
                headers={"X-Tenant": str(tenant.id)},
            )
        ).json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    auth_a = await player_auth()
    auth_b = await player_auth()

    a_redeem = await api.post(
        f"/api/v1/rewards/{rid}/redeem", headers={**auth_a, "Idempotency-Key": "shared-r"}
    )
    assert a_redeem.status_code == 200

    b_reuse = await api.post(
        f"/api/v1/rewards/{rid}/redeem", headers={**auth_b, "Idempotency-Key": "shared-r"}
    )
    assert b_reuse.status_code == 409
    assert a_redeem.json()["id"] not in str(b_reuse.json())
