"""Audit M4 — suspended tenants: players can neither authenticate nor use existing tokens."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.tenants.models import Tenant
from httpx import AsyncClient
from sqlalchemy import update

from ._helpers import create_player, create_tenant, unique


async def _set_tenant_status(tenant_id: object, status: str) -> None:
    async with SessionLocal() as session:  # owner session — tenants table is not RLS'd
        await session.execute(update(Tenant).where(Tenant.id == tenant_id).values(status=status))
        await session.commit()


async def test_suspended_tenant_blocks_login_otp_and_existing_tokens(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email = f"{unique('susp')}@example.com"
    await create_player(tenant.id, email, password="pw")
    headers = {"X-Tenant": str(tenant.id)}

    # Baseline: active tenant works end to end.
    login = await api.post(
        "/api/v1/auth/player/login", json={"email": email, "password": "pw"}, headers=headers
    )
    assert login.status_code == 200
    auth = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert (await api.get("/api/v1/players/me", headers=auth)).status_code == 200

    await _set_tenant_status(tenant.id, "suspended")

    # Fresh authentication is refused with a clear problem+json.
    relogin = await api.post(
        "/api/v1/auth/player/login", json={"email": email, "password": "pw"}, headers=headers
    )
    assert relogin.status_code == 403
    assert relogin.json()["type"] == "urn:problem:tenant_suspended"

    otp_req = await api.post(
        "/api/v1/auth/player/otp/request", json={"email": email}, headers=headers
    )
    assert otp_req.status_code == 403

    otp_verify = await api.post(
        "/api/v1/auth/player/otp/verify",
        json={"email": email, "code": "000000"},
        headers=headers,
    )
    assert otp_verify.status_code == 403

    # Existing access tokens stop working on protected routes immediately.
    me = await api.get("/api/v1/players/me", headers=auth)
    assert me.status_code == 403
    wallet = await api.get("/api/v1/wallet", headers=auth)
    assert wallet.status_code == 403

    # Reactivating restores access.
    await _set_tenant_status(tenant.id, "active")
    assert (await api.get("/api/v1/players/me", headers=auth)).status_code == 200
