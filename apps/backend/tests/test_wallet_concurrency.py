"""Audit C2 — money-movement concurrency: single external call per key, no overdraft.

Uses a counting cashless adapter (with artificial latency to widen race windows) injected via
FastAPI dependency overrides, plus raw-SQL probes for the DB-level overdraft trigger.
"""

from __future__ import annotations

import asyncio
import uuid

import pytest
from app.adapters.factory import get_cashless_port
from app.adapters.mock.cashless import MockCashlessAdapter
from app.db.session import engine
from app.main import app
from app.ports.errors import AdapterUnavailableError
from app.ports.types import Money
from httpx import AsyncClient
from sqlalchemy import text

from ._helpers import create_tenant, player_token


class CountingCashlessAdapter(MockCashlessAdapter):
    """Counts adapter calls and sleeps briefly so concurrent requests overlap mid-flight."""

    def __init__(self, *, fail_ops: set[str] | None = None) -> None:
        super().__init__()
        self.calls: list[str] = []
        self._fail_ops = fail_ops or set()

    async def _hit(self, op: str, key: str) -> None:
        self.calls.append(f"{op}:{key}")
        await asyncio.sleep(0.05)
        if op in self._fail_ops:
            raise AdapterUnavailableError("cashless host offline (test)")

    async def fund(self, account_ref: str, amount: Money, idempotency_key: str):  # type: ignore[no-untyped-def]
        await self._hit("fund", idempotency_key)
        return await super().fund(account_ref, amount, idempotency_key)

    async def transfer(  # type: ignore[no-untyped-def]
        self, account_ref: str, destination_ref: str, amount: Money, idempotency_key: str
    ):
        await self._hit("transfer", idempotency_key)
        return await super().transfer(account_ref, destination_ref, amount, idempotency_key)

    async def cashout(self, account_ref: str, amount: Money, idempotency_key: str):  # type: ignore[no-untyped-def]
        await self._hit("cashout", idempotency_key)
        return await super().cashout(account_ref, amount, idempotency_key)


@pytest.fixture
def counting_adapter():  # type: ignore[no-untyped-def]
    adapter = CountingCashlessAdapter()
    app.dependency_overrides[get_cashless_port] = lambda: adapter
    yield adapter
    app.dependency_overrides.pop(get_cashless_port, None)


async def test_concurrent_same_key_fund_calls_adapter_once(
    api: AsyncClient, counting_adapter: CountingCashlessAdapter
) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    headers = {**auth, "Idempotency-Key": "race-fund"}

    r1, r2 = await asyncio.gather(
        api.post("/api/v1/wallet/fund", headers=headers, json={"amount_cents": 7000}),
        api.post("/api/v1/wallet/fund", headers=headers, json={"amount_cents": 7000}),
    )
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"], "both requests must resolve to the same txn"
    fund_calls = [c for c in counting_adapter.calls if c.startswith("fund:")]
    assert len(fund_calls) == 1, "external side effect must happen exactly once"

    wallet = await api.get("/api/v1/wallet", headers=auth)
    assert wallet.json()["balance_cents"] == 7000


async def test_concurrent_cashouts_cannot_overdraft(
    api: AsyncClient, counting_adapter: CountingCashlessAdapter
) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    fund = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "seed-fund"},
        json={"amount_cents": 5000},
    )
    assert fund.status_code == 200

    r1, r2 = await asyncio.gather(
        api.post(
            "/api/v1/wallet/cashout",
            headers={**auth, "Idempotency-Key": "race-cash-a"},
            json={"amount_cents": 4000},
        ),
        api.post(
            "/api/v1/wallet/cashout",
            headers={**auth, "Idempotency-Key": "race-cash-b"},
            json={"amount_cents": 4000},
        ),
    )
    statuses = sorted([r1.status_code, r2.status_code])
    assert statuses == [200, 409], f"one cashout wins, one is rejected — got {statuses}"

    wallet = await api.get("/api/v1/wallet", headers=auth)
    assert wallet.json()["balance_cents"] == 1000
    assert wallet.json()["balance_cents"] >= 0


async def test_adapter_failure_leaves_failed_row_not_phantom_balance(api: AsyncClient) -> None:
    adapter = CountingCashlessAdapter(fail_ops={"cashout"})
    app.dependency_overrides[get_cashless_port] = lambda: adapter
    try:
        tenant = await create_tenant()
        auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
        await api.post(
            "/api/v1/wallet/fund",
            headers={**auth, "Idempotency-Key": "f-seed"},
            json={"amount_cents": 3000},
        )

        down = await api.post(
            "/api/v1/wallet/cashout",
            headers={**auth, "Idempotency-Key": "f-cash"},
            json={"amount_cents": 1000},
        )
        assert down.status_code == 503

        history = await api.get("/api/v1/wallet/transactions", headers=auth)
        rows = history.json()
        failed = [r for r in rows if r["status"] == "failed"]
        assert len(failed) == 1 and failed[0]["type"] == "cashout"

        # The failed hold releases: full balance remains spendable.
        wallet = await api.get("/api/v1/wallet", headers=auth)
        assert wallet.json()["balance_cents"] == 3000

        # Replaying the failed key returns the failed txn without a second external call.
        calls_before = len(adapter.calls)
        replay = await api.post(
            "/api/v1/wallet/cashout",
            headers={**auth, "Idempotency-Key": "f-cash"},
            json={"amount_cents": 1000},
        )
        assert replay.status_code == 200
        assert replay.json()["status"] == "failed"
        assert len(adapter.calls) == calls_before
    finally:
        app.dependency_overrides.pop(get_cashless_port, None)


async def test_db_trigger_blocks_overdraft_insert(api: AsyncClient, db_engine: object) -> None:
    """Even a code path that skips the wallet lock cannot drive the ledger negative."""
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "t-seed"},
        json={"amount_cents": 1000},
    )
    wallet = await api.get("/api/v1/wallet", headers=auth)
    wallet_id = wallet.json()["id"]
    player_id = wallet.json()["player_id"]

    with pytest.raises(Exception, match="overdraft"):
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "INSERT INTO wallet_transactions "
                    "(id, tenant_id, wallet_id, player_id, type, amount_cents, status, "
                    " idempotency_key, created_at, updated_at) "
                    "VALUES (:id, :tenant, :wallet, :player, 'cashout', -2000, 'completed', "
                    " :idem, now(), now())"
                ),
                {
                    "id": str(uuid.uuid4()),
                    "tenant": str(tenant.id),
                    "wallet": wallet_id,
                    "player": player_id,
                    "idem": f"raw-{uuid.uuid4().hex[:8]}",
                },
            )
