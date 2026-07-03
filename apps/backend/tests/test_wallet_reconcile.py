"""LOW — wallet balance reconciliation corrects cache drift from the ledger."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.wallet.models import Wallet
from app.tenancy.deps import set_tenant_context
from httpx import AsyncClient
from sqlalchemy import select, update

from ._helpers import admin_headers, create_tenant, player_token


async def test_reconcile_corrects_drift(api: AsyncClient) -> None:
    tenant = await create_tenant()
    player_auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    admin = await admin_headers(api, tenant_id=tenant.id)

    # Real money in -> cache matches the ledger.
    await api.post(
        "/api/v1/wallet/fund",
        headers={**player_auth, "Idempotency-Key": "rk"},
        json={"amount_cents": 4200},
    )

    # Corrupt the cached balance directly (simulating drift).
    async with SessionLocal() as session:
        await set_tenant_context(session, tenant.id)
        await session.execute(update(Wallet).values(balance_cents=999999))
        await session.commit()

    resp = await api.post("/api/v1/wallet/admin/reconcile", headers=admin)
    assert resp.status_code == 200
    body = resp.json()
    assert body["checked"] >= 1 and body["corrected"] == 1

    # The cache is back to the derived truth.
    async with SessionLocal() as session:
        await set_tenant_context(session, tenant.id)
        wallet = (await session.execute(select(Wallet))).scalars().first()
        assert wallet is not None and wallet.balance_cents == 4200

    # A second pass finds nothing to correct.
    again = await api.post("/api/v1/wallet/admin/reconcile", headers=admin)
    assert again.json()["corrected"] == 0
