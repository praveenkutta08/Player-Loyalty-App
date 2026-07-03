"""Audit logging (immutable) + analytics event sink."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.db.session import engine
from httpx import AsyncClient
from sqlalchemy import text

from ._helpers import admin_headers, create_tenant, player_token


async def test_privileged_mutations_write_audit(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    player_auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    # Financial mutation (player) -> audit.
    await api.post(
        "/api/v1/wallet/fund",
        headers={**player_auth, "Idempotency-Key": "k1"},
        json={"amount_cents": 1000},
    )
    # Config mutation (admin) -> audit.
    await api.put("/api/v1/config", headers=admin, json={"feature_flags": {"x": True}})

    logs = (await api.get("/api/v1/audit-logs", headers=admin)).json()["items"]
    actions = {row["action"] for row in logs}
    assert "wallet:fund" in actions
    assert "tenant_config:update" in actions


async def test_money_key_and_theme_actions_write_audit(api: AsyncClient) -> None:
    """H3 representative sweep: money movement, digital key, and theme mutations all audit."""
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    player_auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    # Money: transfer + cashout (fund covered above).
    await api.post(
        "/api/v1/wallet/fund",
        headers={**player_auth, "Idempotency-Key": "a-f"},
        json={"amount_cents": 5000},
    )
    await api.post(
        "/api/v1/wallet/transfer",
        headers={**player_auth, "Idempotency-Key": "a-t"},
        json={"amount_cents": 1000, "egm_id": "EGM-1"},
    )
    await api.post(
        "/api/v1/wallet/cashout",
        headers={**player_auth, "Idempotency-Key": "a-c"},
        json={"amount_cents": 500},
    )

    # Digital key: issue + unlock (physical access) — needs a confirmed hotel reservation.
    start = datetime.now(UTC) - timedelta(hours=1)
    end = datetime.now(UTC) + timedelta(days=1)
    res = await api.post(
        "/api/v1/app/reservations",
        headers=player_auth,
        json={"type": "hotel", "start_at": start.isoformat(), "end_at": end.isoformat()},
    )
    key = await api.post(
        "/api/v1/keys",
        headers=player_auth,
        json={"reservation_id": res.json()["id"], "room": "1204"},
    )
    assert key.status_code == 200
    key_id = key.json()["id"]
    await api.post(f"/api/v1/keys/{key_id}/unlock", headers=player_auth, json={"door_id": "D-1"})

    # Theme mutation (admin).
    theme = await api.post(
        "/api/v1/config/themes",
        headers=admin,
        json={"name": "Audit Theme", "tokens": {"color": {"primary": "#123456"}}},
    )
    assert theme.status_code == 201

    logs = (await api.get("/api/v1/audit-logs", headers=admin)).json()["items"]
    actions = {row["action"] for row in logs}
    for expected in (
        "wallet:transfer_to_egm",
        "wallet:cashout",
        "digitalkey:issue",
        "digitalkey:unlock",
        "theme:create",
    ):
        assert expected in actions, f"missing audit action {expected}; got {sorted(actions)}"

    # Actor attribution: player actions carry the player actor, admin actions the admin actor.
    by_action = {row["action"]: row for row in logs}
    assert by_action["wallet:cashout"]["actor_type"] == "player"
    assert by_action["theme:create"]["actor_type"] == "admin"


async def test_analytics_records_redemption(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    player_auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    created = await api.post("/api/v1/offers", headers=admin, json={"title": "Freebie"})
    offer_id = created.json()["id"]
    await api.post(f"/api/v1/offers/{offer_id}/publish", headers=admin)
    await api.post(f"/api/v1/app/offers/{offer_id}/redeem", headers=player_auth)

    summary = (await api.get("/api/v1/analytics/summary", headers=admin)).json()
    assert summary.get("redemption", 0) >= 1


async def test_audit_log_is_immutable(api: AsyncClient, db_engine: object) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    await api.put("/api/v1/config", headers=admin, json={"feature_flags": {"y": True}})
    row = (await api.get("/api/v1/audit-logs", headers=admin)).json()["items"][0]

    with pytest.raises(Exception, match="append-only"):
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE audit_logs SET action = 'x' WHERE id = :id"),
                {"id": uuid.UUID(row["id"])},
            )
