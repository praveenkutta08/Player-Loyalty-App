"""Audit logging (immutable) + analytics event sink."""

from __future__ import annotations

import uuid

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

    logs = (await api.get("/api/v1/audit-logs", headers=admin)).json()
    actions = {row["action"] for row in logs}
    assert "wallet:fund" in actions
    assert "tenant_config:update" in actions


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
    row = (await api.get("/api/v1/audit-logs", headers=admin)).json()[0]

    with pytest.raises(Exception, match="append-only"):
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE audit_logs SET action = 'x' WHERE id = :id"),
                {"id": uuid.UUID(row["id"])},
            )
