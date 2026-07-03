"""Wallet: idempotency, derived balance math, failure handling, ledger immutability."""

from __future__ import annotations

import uuid

import pytest
from app.db.session import engine
from httpx import AsyncClient
from sqlalchemy import text

from ._helpers import create_tenant, player_token


async def test_balance_math_and_idempotency(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    fund = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "k-fund-1"},
        json={"amount_cents": 10000},
    )
    assert fund.status_code == 200
    # Idempotent: same key -> same txn, no double credit.
    fund_again = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "k-fund-1"},
        json={"amount_cents": 10000},
    )
    assert fund_again.json()["id"] == fund.json()["id"]

    await api.post(
        "/api/v1/wallet/transfer",
        headers={**auth, "Idempotency-Key": "k-xfer-1"},
        json={"amount_cents": 3000, "egm_id": "EGM-42"},
    )
    await api.post(
        "/api/v1/wallet/cashout",
        headers={**auth, "Idempotency-Key": "k-cash-1"},
        json={"amount_cents": 2000},
    )

    wallet = await api.get("/api/v1/wallet", headers=auth)
    assert wallet.json()["balance_cents"] == 5000  # 10000 - 3000 - 2000


async def test_transaction_history(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    # Empty ledger to start.
    empty = await api.get("/api/v1/wallet/transactions", headers=auth)
    assert empty.status_code == 200
    assert empty.json()["items"] == []

    await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "h-fund"},
        json={"amount_cents": 8000},
    )
    await api.post(
        "/api/v1/wallet/transfer",
        headers={**auth, "Idempotency-Key": "h-xfer"},
        json={"amount_cents": 2500, "egm_id": "EGM-9"},
    )

    history = await api.get("/api/v1/wallet/transactions", headers=auth)
    assert history.status_code == 200
    rows = history.json()["items"]
    assert len(rows) == 2
    # Newest first: the transfer precedes the fund; each carries a timestamp + signed amount.
    assert rows[0]["type"] == "transfer_to_egm"
    assert rows[0]["amount_cents"] == -2500
    assert rows[0]["egm_id"] == "EGM-9"
    assert rows[1]["type"] == "fund"
    assert rows[1]["amount_cents"] == 8000
    assert "created_at" in rows[0]


async def test_transaction_history_cursor_pagination(api: AsyncClient) -> None:
    """M2 — the ledger pages via opaque cursors: keyset on (created_at, id), newest first, with no
    overlap or gaps as the caller follows `next_cursor` to exhaustion."""
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    for i in range(5):
        resp = await api.post(
            "/api/v1/wallet/fund",
            headers={**auth, "Idempotency-Key": f"page-{i}"},
            json={"amount_cents": 1000 + i},
        )
        assert resp.status_code == 200

    seen: list[str] = []
    cursor: str | None = None
    pages = 0
    while True:
        params = {"limit": 2}
        if cursor:
            params["cursor"] = cursor
        resp = await api.get("/api/v1/wallet/transactions", headers=auth, params=params)
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) <= 2
        seen.extend(row["id"] for row in body["items"])
        pages += 1
        cursor = body["next_cursor"]
        if not body["has_more"]:
            assert cursor is None
            break
        assert cursor is not None
        assert pages <= 5  # guard against a non-terminating cursor

    # Every row exactly once, across 3 pages (2 + 2 + 1), newest-first and de-duplicated.
    assert pages == 3
    assert len(seen) == 5
    assert len(set(seen)) == 5


async def test_insufficient_funds_and_missing_key(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    # Missing Idempotency-Key -> 400.
    missing = await api.post("/api/v1/wallet/fund", headers=auth, json={"amount_cents": 100})
    assert missing.status_code == 400

    # Cashing out with no funds -> 409.
    broke = await api.post(
        "/api/v1/wallet/cashout",
        headers={**auth, "Idempotency-Key": "k-x"},
        json={"amount_cents": 5000},
    )
    assert broke.status_code == 409


async def test_egm_pair(api: AsyncClient) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    resp = await api.post("/api/v1/egm/pair", headers=auth, json={"egm_id": "EGM-7"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "paired"
    assert resp.json()["egm_id"] == "EGM-7"


async def test_ledger_is_immutable(api: AsyncClient, db_engine: object) -> None:
    tenant = await create_tenant()
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    txn = await api.post(
        "/api/v1/wallet/fund",
        headers={**auth, "Idempotency-Key": "k-immut"},
        json={"amount_cents": 500},
    )
    txn_id = uuid.UUID(txn.json()["id"])

    # A DB trigger blocks UPDATE/DELETE on wallet_transactions.
    with pytest.raises(Exception, match="append-only"):
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE wallet_transactions SET amount_cents = 0 WHERE id = :id"),
                {"id": txn_id},
            )
