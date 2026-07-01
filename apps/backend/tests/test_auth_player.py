"""Player auth: password + OTP login, /me, and admin/player audience separation."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.players.service import create_player_otp
from app.tenancy.deps import set_tenant_context
from httpx import AsyncClient

from ._helpers import create_admin, create_player, create_tenant, unique


async def test_player_password_login_and_me(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email = f"{unique('player')}@example.com"
    await create_player(tenant.id, email, password="pw-secret")

    resp = await api.post(
        "/api/v1/auth/player/login",
        json={"email": email, "password": "pw-secret"},
        headers={"X-Tenant": str(tenant.id)},
    )
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    me = await api.get("/api/v1/players/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == email
    assert body["tenant_id"] == str(tenant.id)


async def test_player_otp_flow(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email = f"{unique('player')}@example.com"
    await create_player(tenant.id, email)  # OTP-only player (no password)

    # otp/request never reveals existence; it returns 202.
    requested = await api.post(
        "/api/v1/auth/player/otp/request",
        json={"email": email},
        headers={"X-Tenant": str(tenant.id)},
    )
    assert requested.status_code == 202

    # Obtain a real code via the service (the endpoint only logs it in dev).
    async with SessionLocal() as session:
        await set_tenant_context(session, tenant.id)
        code = await create_player_otp(session, tenant.id, email)
        await session.commit()

    verified = await api.post(
        "/api/v1/auth/player/otp/verify",
        json={"email": email, "code": code},
        headers={"X-Tenant": str(tenant.id)},
    )
    assert verified.status_code == 200
    assert verified.json()["access_token"]


async def test_audience_separation(api: AsyncClient) -> None:
    tenant = await create_tenant()
    player_email = f"{unique('player')}@example.com"
    admin_email = f"{unique('super')}@example.com"
    await create_player(tenant.id, player_email, password="pw")
    await create_admin(admin_email, "pw", "super_admin")

    player_token = (
        await api.post(
            "/api/v1/auth/player/login",
            json={"email": player_email, "password": "pw"},
            headers={"X-Tenant": str(tenant.id)},
        )
    ).json()["access_token"]
    admin_token = (
        await api.post("/api/v1/auth/admin/login", json={"email": admin_email, "password": "pw"})
    ).json()["access_token"]

    # Player token rejected on an admin route.
    r1 = await api.get("/api/v1/auth/admin/me", headers={"Authorization": f"Bearer {player_token}"})
    assert r1.status_code == 401

    # Admin token rejected on a player route.
    r2 = await api.get("/api/v1/players/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r2.status_code == 401
