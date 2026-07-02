"""P6.7: the demo seed is idempotent (concierge config, offers, properties) and the player
analytics event sink writes allowlisted events."""

from __future__ import annotations

import uuid

from app.db.session import SessionLocal
from app.modules.audit.models import AnalyticsEvent
from app.modules.concierge.models import Property
from app.modules.offers.models import Offer
from app.seed import seed
from httpx import AsyncClient
from sqlalchemy import func, select

from ._helpers import create_tenant, player_token, unique


async def _counts(tenant_id: str) -> tuple[int, int]:
    async with SessionLocal() as session:
        offers = (
            await session.execute(
                select(func.count())
                .select_from(Offer)
                .where(Offer.tenant_id == uuid.UUID(tenant_id))
            )
        ).scalar_one()
        properties = (
            await session.execute(
                select(func.count())
                .select_from(Property)
                .where(Property.tenant_id == uuid.UUID(tenant_id))
            )
        ).scalar_one()
    return offers, properties


async def test_seed_is_idempotent_and_provisions_concierge(db_engine: object) -> None:
    first = await seed()
    offers_after_first, properties_after_first = await _counts(first["tenant_id"])
    assert offers_after_first >= 12  # welcome + promo + ~10 concierge offers
    assert properties_after_first == 2

    second = await seed()  # re-run: no duplicates
    assert second["tenant_id"] == first["tenant_id"]
    assert await _counts(first["tenant_id"]) == (offers_after_first, properties_after_first)

    # Concierge is enabled + configured for the demo tenant.
    from app.modules.tenant_config.models import TenantConfig

    async with SessionLocal() as session:
        config = (
            await session.execute(
                select(TenantConfig).where(
                    TenantConfig.tenant_id == uuid.UUID(first["tenant_id"])
                )
            )
        ).scalar_one()
        assert config.feature_flags["concierge"] is True
        assert config.concierge["persona"]["name"] == "Aria"
        assert config.concierge["weights"]["value_at_risk"] > 0


async def test_client_event_sink_writes_allowlisted_events(api: AsyncClient) -> None:
    tenant = await create_tenant(unique("metrics"))
    token = await player_token(api, tenant.id)
    auth = {"Authorization": f"Bearer {token}"}

    accepted = await api.post(
        "/api/v1/analytics/events",
        headers=auth,
        json={"type": "answer_accepted", "meta": {"fit_score": 82}},
    )
    assert accepted.status_code == 200 and accepted.json() == {"accepted": True}

    timing = await api.post(
        "/api/v1/analytics/events",
        headers=auth,
        json={"type": "brief_render_ms", "meta": {"ms": 240}},
    )
    assert timing.json() == {"accepted": True}

    # Unknown types are dropped (fire-and-forget clients), not stored and not an error.
    dropped = await api.post(
        "/api/v1/analytics/events", headers=auth, json={"type": "totally_custom"}
    )
    assert dropped.status_code == 200 and dropped.json() == {"accepted": False}

    async with SessionLocal() as session:
        rows = (
            (
                await session.execute(
                    select(AnalyticsEvent).where(AnalyticsEvent.tenant_id == tenant.id)
                )
            )
            .scalars()
            .all()
        )
    types = sorted(r.type for r in rows)
    assert types == ["answer_accepted", "brief_render_ms"]
    assert all(r.player_id is not None for r in rows)

    # Requires a player token.
    anonymous = await api.post("/api/v1/analytics/events", json={"type": "answer_accepted"})
    assert anonymous.status_code == 401
