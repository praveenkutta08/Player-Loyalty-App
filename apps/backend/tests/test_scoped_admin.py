"""A scoped super-admin (Account Manager) may only see their assigned tenants."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import create_admin, create_tenant, unique


async def test_scoped_admin_sees_only_allowed_tenants(api: AsyncClient) -> None:
    t1 = await create_tenant()
    t2 = await create_tenant()
    t3 = await create_tenant()

    email = f"{unique('am')}@example.com"
    await create_admin(email, "pw", "account_manager", allowed_tenant_ids=[t1.id, t2.id])
    login = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    token = login.json()["access_token"]

    resp = await api.get("/api/v1/tenants", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    ids = {row["id"] for row in resp.json()}
    assert str(t1.id) in ids
    assert str(t2.id) in ids
    assert str(t3.id) not in ids  # not assigned -> invisible


async def test_global_super_admin_sees_all_tenants(api: AsyncClient) -> None:
    t1 = await create_tenant()
    t2 = await create_tenant()

    email = f"{unique('super')}@example.com"
    await create_admin(email, "pw", "super_admin")
    login = await api.post("/api/v1/auth/admin/login", json={"email": email, "password": "pw"})
    token = login.json()["access_token"]

    resp = await api.get("/api/v1/tenants", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    ids = {row["id"] for row in resp.json()}
    assert {str(t1.id), str(t2.id)} <= ids
