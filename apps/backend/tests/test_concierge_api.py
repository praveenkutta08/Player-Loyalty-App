"""Concierge endpoint tests (P6.3): envelope shape, RG-neutral brief, consent gating, answer
cache hits, quiet-hours/frequency-cap suppression, itinerary, history, and the append-only
concierge_answers audit trail."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from app.core.cache import get_cache
from app.db.session import SessionLocal
from app.modules.concierge.models import ConciergeAnswer, Property
from app.modules.concierge.service import rg_restriction
from app.modules.offers.models import Offer, OfferKind, OfferStatus
from app.modules.players.models import Player
from app.modules.tenant_config.models import TenantConfig
from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.exc import DBAPIError

from tests._helpers import create_tenant, player_token, unique

ENVELOPE_KEYS = {
    "use_case",
    "verdict",
    "fit_score",
    "confidence",
    "reasons",
    "signals",
    "sources",
    "degraded",
    "cta",
    "disclaimer",
    "generated_at",
    "cache_ttl_s",
}
KNOWN_SOURCES = {"player-mcp", "offers-mcp", "weather-mcp", "maps-mcp"}


async def _setup_tenant(*, guardrails: dict | None = None) -> tuple[uuid.UUID, dict[str, str]]:
    """Tenant + property + published offer + config; returns (tenant_id, player auth headers)."""
    tenant = await create_tenant(unique("concierge"))
    async with SessionLocal() as session:
        session.add_all(
            [
                Property(
                    tenant_id=tenant.id,
                    name=unique("Cascade Resort"),
                    lat=36.11,
                    lng=-115.17,
                    amenities=["steakhouse", "spa"],
                ),
                Offer(
                    tenant_id=tenant.id,
                    kind=OfferKind.offer.value,
                    title="Weekend bonus",
                    status=OfferStatus.published.value,
                    segment="all",
                    end_at=datetime.now(UTC) + timedelta(days=2),
                ),
                TenantConfig(
                    tenant_id=tenant.id,
                    concierge={
                        "guardrails": guardrails
                        or {
                            # Impossible quiet window + huge cap → nudges always allowed.
                            "quiet_hours_start": 3,
                            "quiet_hours_end": 3,
                            "frequency_cap_per_day": 1000,
                        }
                    },
                ),
            ]
        )
        await session.commit()
    return tenant.id, {}


async def _auth(api: AsyncClient, tenant_id: uuid.UUID) -> tuple[dict[str, str], str]:
    email = f"{unique('cplayer')}@example.com"
    token = await player_token(api, tenant_id, email=email)
    return {"Authorization": f"Bearer {token}"}, email


async def _set_player(email: str, tenant_id: uuid.UUID, **values: object) -> None:
    async with SessionLocal() as session:
        await session.execute(
            update(Player)
            .where(Player.tenant_id == tenant_id, Player.email == email)
            .values(**values)
        )
        await session.commit()


async def test_brief_envelope_shape_and_audit_row(api: AsyncClient) -> None:
    tenant_id, _ = await _setup_tenant()
    auth, email = await _auth(api, tenant_id)

    resp = await api.get("/api/v1/concierge/brief", headers=auth)
    assert resp.status_code == 200
    body = resp.json()
    assert set(body) >= ENVELOPE_KEYS
    assert body["use_case"] == "brief"
    assert isinstance(body["fit_score"], int) and 0 <= body["fit_score"] <= 100
    assert body["confidence"] in {"high", "medium", "low"}
    assert set(body["sources"]) <= KNOWN_SOURCES and body["sources"]
    assert body["disclaimer"] == "Recommendations are advisory."
    assert body["cta"] == {"label": "Plan my visit", "action": "concierge.plan"}
    assert all({"code", "chip", "detail", "source"} <= set(r) for r in body["reasons"])
    # No consent yet → travel is degraded and flagged, never fabricated.
    assert "maps.get_travel_time" in body["degraded"]
    assert any(r["code"] == "travel_fit_missing" for r in body["reasons"])

    # Append-only audit row (golden rule #8) with hash + tools + scores.
    async with SessionLocal() as session:
        row = (
            await session.execute(
                select(ConciergeAnswer).where(ConciergeAnswer.use_case == "brief")
            )
        ).scalars().all()
        mine = [r for r in row if r.output.get("verdict") == body["verdict"]]
        assert mine
        answer = mine[-1]
        assert len(answer.inputs_hash) == 64
        assert "get_player_value" in answer.tools_called
        assert answer.scores["fit_score"] == body["fit_score"]

        # Immutability: UPDATE raises via the DB trigger.
        with pytest.raises(DBAPIError):
            await session.execute(
                update(ConciergeAnswer)
                .where(ConciergeAnswer.id == answer.id)
                .values(use_case="tampered")
            )
    del email


async def test_rg_flagged_player_gets_neutral_brief(api: AsyncClient) -> None:
    tenant_id, _ = await _setup_tenant()
    auth, email = await _auth(api, tenant_id)
    await _set_player(email, tenant_id, rg_flags={"self_exclusion": True})

    resp = await api.get("/api/v1/concierge/brief", headers=auth)
    assert resp.status_code == 200
    body = resp.json()
    # Neutral: no fit score, no visit-nudge CTA, no urgency reasons.
    assert body["fit_score"] is None
    assert body["cta"] is None
    assert body["reasons"] == []
    assert body["verdict"]  # still helpful service content

    # Cool-off and limits restrict too; expired cool-off does not.
    future = (datetime.now(UTC) + timedelta(days=2)).isoformat()
    past = (datetime.now(UTC) - timedelta(days=2)).isoformat()
    p = Player(tenant_id=tenant_id, email="x@x.com")
    p.rg_flags = {"cool_off_until": future}
    assert rg_restriction(p) == "cool_off"
    p.rg_flags = {"cool_off_until": past}
    assert rg_restriction(p) is None
    p.rg_flags = {"limits": {"deposit_daily_cents": 10000}}
    assert rg_restriction(p) == "limits"
    p.rg_flags = None
    assert rg_restriction(p) is None


async def test_consent_gates_travel_and_unlocks_drive_signal(api: AsyncClient) -> None:
    tenant_id, _ = await _setup_tenant()
    auth, email = await _auth(api, tenant_id)

    before = (await api.get("/api/v1/concierge/brief", headers=auth)).json()
    assert not any(s["label"] == "Drive" for s in before["signals"])

    await _set_player(
        email,
        tenant_id,
        concierge_consent=True,
        home_origin={"lat": 36.0, "lng": -115.0, "label": "Home"},
    )
    # Consent participates in the context hash → this is a fresh answer, not the cached one.
    after = (await api.get("/api/v1/concierge/brief", headers=auth)).json()
    assert any(s["label"] == "Drive" for s in after["signals"])
    assert "maps.get_travel_time" not in after["degraded"]
    assert "maps-mcp" in after["sources"]


async def test_answer_cache_serves_second_call(api: AsyncClient) -> None:
    tenant_id, _ = await _setup_tenant()
    auth, _email = await _auth(api, tenant_id)
    get_cache.cache_clear()  # isolate from other tests' cache instances

    first = (await api.get("/api/v1/concierge/brief", headers=auth)).json()
    second = (await api.get("/api/v1/concierge/brief", headers=auth)).json()
    assert first == second  # byte-identical envelope from the answer cache

    async with SessionLocal() as session:
        count = len(
            (
                await session.execute(
                    select(ConciergeAnswer).where(
                        ConciergeAnswer.tenant_id == tenant_id,
                        ConciergeAnswer.use_case == "brief",
                    )
                )
            )
            .scalars()
            .all()
        )
    assert count == 1  # cache hit → no second orchestration, no second audit row


async def test_quiet_hours_and_frequency_cap_suppress_nudge(api: AsyncClient) -> None:
    now_hour = datetime.now(UTC).hour
    tenant_id, _ = await _setup_tenant(
        guardrails={
            "quiet_hours_start": now_hour,
            "quiet_hours_end": (now_hour + 1) % 24,
            "frequency_cap_per_day": 1000,
        }
    )
    auth, _email = await _auth(api, tenant_id)
    body = (await api.get("/api/v1/concierge/brief", headers=auth)).json()
    assert body["fit_score"] is None and body["cta"] is None  # quiet hours → no nudge

    # Frequency cap 0 → capped immediately (different tenant to avoid cache/window overlap).
    tenant2, _ = await _setup_tenant(
        guardrails={"quiet_hours_start": 3, "quiet_hours_end": 3, "frequency_cap_per_day": 0}
    )
    auth2, _ = await _auth(api, tenant2)
    capped = (await api.get("/api/v1/concierge/brief", headers=auth2)).json()
    assert capped["fit_score"] is None and capped["cta"] is None


async def test_offers_plan_ask_history(api: AsyncClient) -> None:
    tenant_id, _ = await _setup_tenant()
    auth, email = await _auth(api, tenant_id)
    await _set_player(
        email, tenant_id, concierge_consent=True, home_origin={"lat": 36.0, "lng": -115.0}
    )

    offers = (await api.get("/api/v1/concierge/offers", headers=auth)).json()
    assert offers["items"], "ranked offers expected"
    top = offers["items"][0]
    assert top["rank"] == 1 and top["why_you"]
    assert "offers-mcp" in offers["sources"]

    plan = await api.post("/api/v1/concierge/plan", headers=auth, json={})
    assert plan.status_code == 200
    itinerary = plan.json()["itinerary"]
    assert len(itinerary) >= 2
    assert itinerary[0]["title"] == "Leave home"
    times = [step["time"] for step in itinerary]
    assert times == sorted(times)  # chronological

    ask = await api.post(
        "/api/v1/concierge/ask",
        headers=auth,
        json={"question": "Is it worth driving in this weekend?"},
    )
    assert ask.status_code == 200
    assert ask.json()["verdict"]
    assert set(ask.json()["sources"]) <= KNOWN_SOURCES

    history = (await api.get("/api/v1/concierge/history", headers=auth)).json()
    use_cases = {h["use_case"] for h in history}
    assert {"offers", "plan", "ask"} <= use_cases
    assert all(h["verdict"] for h in history)


async def test_endpoints_require_player_auth(api: AsyncClient) -> None:
    resp = await api.get("/api/v1/concierge/brief")
    assert resp.status_code == 401
