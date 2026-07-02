"""Concierge Studio backend tests (P6.4): config publish bumps the manifest + persona block,
what-if preview honours candidate weights without auditing, RBAC gates both admin endpoints."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.concierge.models import ConciergeAnswer, Property
from httpx import AsyncClient
from sqlalchemy import select

from ._helpers import admin_headers, create_player, create_tenant, unique


async def _tenant_with_property() -> object:
    tenant = await create_tenant(unique("studio"))
    async with SessionLocal() as session:
        session.add(
            Property(tenant_id=tenant.id, name=unique("Resort"), lat=36.11, lng=-115.17)
        )
        await session.commit()
    return tenant


async def test_concierge_config_publish_bumps_manifest_with_persona(api: AsyncClient) -> None:
    tenant = await _tenant_with_property()
    headers = await admin_headers(
        api, role="tenant_admin", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )

    before = (
        await api.get("/api/v1/config/manifest", headers={"X-Tenant": str(tenant.id)})
    ).json()

    update = await api.put(
        "/api/v1/config",
        headers=headers,
        json={
            "feature_flags": {"concierge": True},
            "concierge": {
                "persona": {"name": "Ruby", "tone": "playful", "accent_token": "primary"},
                "weights": {
                    "value_at_risk": 0.4,
                    "weather_fit": 0.2,
                    "travel_fit": 0.2,
                    "tier_urgency": 0.2,
                },
                "guardrails": {"quiet_hours_start": 23, "quiet_hours_end": 7,
                               "frequency_cap_per_day": 2},
            },
        },
    )
    assert update.status_code == 200
    assert update.json()["concierge"]["persona"]["name"] == "Ruby"

    after = (
        await api.get("/api/v1/config/manifest", headers={"X-Tenant": str(tenant.id)})
    ).json()
    assert after["version"] > before["version"]  # publish bumps the manifest
    assert after["feature_flags"]["concierge"] is True
    assert after["concierge"] == {
        "persona_name": "Ruby",
        "tone": "playful",
        "accent_token": "primary",
    }  # persona is public; weights/guardrails stay server-side
    assert "weights" not in (after["concierge"] or {})


async def test_preview_honours_weights_and_writes_no_audit_row(api: AsyncClient) -> None:
    tenant = await _tenant_with_property()
    await create_player(tenant.id, f"{unique('seed')}@example.com")
    headers = await admin_headers(
        api, role="tenant_admin", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )

    default = await api.post("/api/v1/concierge/preview", headers=headers, json={})
    assert default.status_code == 200
    assert isinstance(default.json()["fit_score"], int)

    # An all-in-one-component weighting must change the computed score deterministically.
    skewed = await api.post(
        "/api/v1/concierge/preview",
        headers=headers,
        json={
            "weights": {
                "value_at_risk": 1.0,
                "weather_fit": 0.0,
                "travel_fit": 0.0,
                "tier_urgency": 0.0,
            }
        },
    )
    assert skewed.status_code == 200
    assert skewed.json()["fit_score"] != default.json()["fit_score"]

    # Previews are what-ifs, not player answers: nothing lands in concierge_answers.
    async with SessionLocal() as session:
        rows = (
            (
                await session.execute(
                    select(ConciergeAnswer).where(ConciergeAnswer.tenant_id == tenant.id)
                )
            )
            .scalars()
            .all()
        )
    assert rows == []


async def test_admin_endpoints_are_permission_gated(api: AsyncClient) -> None:
    tenant = await _tenant_with_property()
    await create_player(tenant.id, f"{unique('seed')}@example.com")
    marketer = await admin_headers(
        api, role="marketer_editor", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )

    assert (
        await api.post("/api/v1/concierge/preview", headers=marketer, json={})
    ).status_code == 403
    assert (await api.get("/api/v1/concierge/answers", headers=marketer)).status_code == 403


async def test_recent_answers_lists_tenant_activity(api: AsyncClient) -> None:
    tenant = await _tenant_with_property()
    email = f"{unique('p')}@example.com"
    from ._helpers import player_token

    token = await player_token(api, tenant.id, email=email)
    await api.get(
        "/api/v1/concierge/brief", headers={"Authorization": f"Bearer {token}"}
    )

    headers = await admin_headers(
        api, role="tenant_admin", tenant_id=tenant.id, allowed_tenant_ids=[tenant.id]
    )
    answers = await api.get("/api/v1/concierge/answers", headers=headers)
    assert answers.status_code == 200
    items = answers.json()
    assert items and items[0]["use_case"] == "brief"
    assert items[0]["tools_called"]
    assert "verdict" in items[0]
