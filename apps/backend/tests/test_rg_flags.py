"""Audit H2 — responsible-gaming write path: permission-gated, audited, honored by concierge."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from httpx import AsyncClient

from ._helpers import admin_headers, create_tenant, player_token, unique


async def _player_with_auth(api: AsyncClient, tenant_id: object) -> tuple[str, dict[str, str]]:
    email = f"{unique('rg')}@example.com"
    token = await player_token(api, tenant_id, email=email)  # type: ignore[arg-type]
    return email, {"Authorization": f"Bearer {token}"}


async def _lookup(api: AsyncClient, admin: dict[str, str], email: str) -> dict:
    resp = await api.get("/api/v1/players/lookup", headers=admin, params={"email": email})
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_rg_flags_require_compliance_permission(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email, _ = await _player_with_auth(api, tenant.id)
    tenant_admin = await admin_headers(
        api, role="tenant_admin", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )
    marketer = await admin_headers(
        api, role="marketer_editor", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )
    player_id = (await _lookup(api, tenant_admin, email))["id"]

    denied = await api.patch(
        f"/api/v1/players/{player_id}/rg-flags", headers=marketer, json={"self_exclusion": True}
    )
    assert denied.status_code == 403

    allowed = await api.patch(
        f"/api/v1/players/{player_id}/rg-flags",
        headers=tenant_admin,
        json={"self_exclusion": True},
    )
    assert allowed.status_code == 200
    assert allowed.json()["rg_flags"] == {"self_exclusion": True}


async def test_rg_flags_write_audit_and_neutralize_concierge(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email, player_auth = await _player_with_auth(api, tenant.id)
    admin = await admin_headers(api, tenant_id=tenant.id)
    player_id = (await _lookup(api, admin, email))["id"]

    resp = await api.patch(
        f"/api/v1/players/{player_id}/rg-flags",
        headers=admin,
        json={"self_exclusion": True},
    )
    assert resp.status_code == 200

    # Audited (Golden Rule #8) with admin actor attribution.
    logs = (await api.get("/api/v1/audit-logs", headers=admin)).json()["items"]
    rg_rows = [r for r in logs if r["action"] == "player:rg_flags_update"]
    assert rg_rows and rg_rows[0]["actor_type"] == "admin"
    assert rg_rows[0]["meta"]["self_exclusion"] is True

    # The concierge honors the flag: neutral brief, no fit score / CTA / urgency.
    brief = await api.get("/api/v1/concierge/brief", headers=player_auth)
    assert brief.status_code == 200
    body = brief.json()
    assert body["fit_score"] is None
    assert body["cta"] is None
    assert body["reasons"] == []

    # The flagged player shows in the compliance list.
    flagged = (await api.get("/api/v1/players/rg-flagged", headers=admin)).json()
    assert any(p["email"] == email for p in flagged)

    # Clearing flags (all-clear body) removes them.
    cleared = await api.patch(
        f"/api/v1/players/{player_id}/rg-flags", headers=admin, json={}
    )
    assert cleared.status_code == 200
    assert cleared.json()["rg_flags"] is None


async def test_rg_cool_off_must_be_future(api: AsyncClient) -> None:
    tenant = await create_tenant()
    email, _ = await _player_with_auth(api, tenant.id)
    admin = await admin_headers(api, tenant_id=tenant.id)
    player_id = (await _lookup(api, admin, email))["id"]

    past = (datetime.now(UTC) - timedelta(days=1)).isoformat()
    resp = await api.patch(
        f"/api/v1/players/{player_id}/rg-flags",
        headers=admin,
        json={"cool_off_until": past},
    )
    assert resp.status_code == 422

    future = (datetime.now(UTC) + timedelta(days=7)).isoformat()
    ok = await api.patch(
        f"/api/v1/players/{player_id}/rg-flags",
        headers=admin,
        json={"cool_off_until": future},
    )
    assert ok.status_code == 200
    assert "cool_off_until" in ok.json()["rg_flags"]
