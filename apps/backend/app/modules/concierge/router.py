"""Concierge endpoints: player brief/offers/plan/ask/history (P6.3) and the admin studio's
preview + audit list (P6.4).

The player dependency binds the RLS tenant context; every answer runs through the orchestrator
(guardrails → tools → scoring → narration → append-only audit row). The admin preview runs the
same orchestrator in what-if mode (candidate weights, no cache, no audit row).
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import (
    get_llm_port,
    get_loyalty_port,
    get_travel_port,
    get_weather_port,
)
from ...core.errors import ProblemException
from ...db.session import get_session
from ...ports.llm import LlmPort
from ...ports.loyalty import LoyaltyPort
from ...ports.travel import TravelPort
from ...ports.weather import WeatherPort
from ...rbac.deps import AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..players.deps import get_current_player
from ..players.models import Player
from .models import ConciergeAnswer
from .schemas import (
    AdminAnswerOut,
    AnswerSummaryOut,
    AskIn,
    ConciergeEnvelope,
    ConciergeOffersOut,
    ConciergePlanOut,
    PlanIn,
    PreviewIn,
)
from .scoring import ScoreWeights
from .service import list_history, run_use_case
from .tools import ToolContext

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
LoyaltyDep = Annotated[LoyaltyPort, Depends(get_loyalty_port)]
WeatherDep = Annotated[WeatherPort, Depends(get_weather_port)]
TravelDep = Annotated[TravelPort, Depends(get_travel_port)]
LlmDep = Annotated[LlmPort, Depends(get_llm_port)]


def _ctx(
    session: AsyncSession,
    player: Player,
    loyalty: LoyaltyPort,
    weather: WeatherPort,
    travel: TravelPort,
) -> ToolContext:
    return ToolContext(
        session=session, player=player, loyalty=loyalty, weather=weather, travel=travel
    )


@router.get("/concierge/brief", response_model=ConciergeEnvelope, tags=["concierge"])
async def brief(
    session: SessionDep,
    player: PlayerDep,
    loyalty: LoyaltyDep,
    weather: WeatherDep,
    travel: TravelDep,
    llm: LlmDep,
    horizon: Literal["today", "weekend"] = "today",
) -> ConciergeEnvelope:
    """Use case 1 — 'Should I visit?' Home-hero payload."""
    envelope = await run_use_case(
        session,
        player,
        llm,
        _ctx(session, player, loyalty, weather, travel),
        "brief",
        params={"horizon": horizon},
    )
    return ConciergeEnvelope.model_validate(envelope)


@router.get("/concierge/offers", response_model=ConciergeOffersOut, tags=["concierge"])
async def ranked_offers(
    session: SessionDep,
    player: PlayerDep,
    loyalty: LoyaltyDep,
    weather: WeatherDep,
    travel: TravelDep,
    llm: LlmDep,
) -> ConciergeOffersOut:
    """Use case 2 — top 5–10 ranked offers, each with machine-readable why_you reasons."""
    envelope = await run_use_case(
        session, player, llm, _ctx(session, player, loyalty, weather, travel), "offers"
    )
    envelope.setdefault("items", [])
    return ConciergeOffersOut.model_validate(envelope)


@router.post("/concierge/plan", response_model=ConciergePlanOut, tags=["concierge"])
async def plan_visit(
    body: PlanIn,
    session: SessionDep,
    player: PlayerDep,
    loyalty: LoyaltyDep,
    weather: WeatherDep,
    travel: TravelDep,
    llm: LlmDep,
) -> ConciergePlanOut:
    """Use case 3 — deterministic itinerary (leave time, first stop, offer order, dinner)."""
    envelope = await run_use_case(
        session,
        player,
        llm,
        _ctx(session, player, loyalty, weather, travel),
        "plan",
        params={"date": body.date},
    )
    envelope.setdefault("itinerary", [])
    return ConciergePlanOut.model_validate(envelope)


@router.post("/concierge/ask", response_model=ConciergeEnvelope, tags=["concierge"])
async def ask(
    body: AskIn,
    session: SessionDep,
    player: PlayerDep,
    loyalty: LoyaltyDep,
    weather: WeatherDep,
    travel: TravelDep,
    llm: LlmDep,
) -> ConciergeEnvelope:
    """Free-form question; answered from tool context, rendered as signal cards + sources."""
    envelope = await run_use_case(
        session,
        player,
        llm,
        _ctx(session, player, loyalty, weather, travel),
        "ask",
        params={"question": body.question},
    )
    return ConciergeEnvelope.model_validate(envelope)


@router.get("/concierge/history", response_model=list[AnswerSummaryOut], tags=["concierge"])
async def history(session: SessionDep, player: PlayerDep) -> list[AnswerSummaryOut]:
    answers = await list_history(session, player)
    return [
        AnswerSummaryOut(
            id=a.id,
            use_case=a.use_case,
            verdict=str(a.output.get("verdict", "")),
            created_at=a.created_at,
        )
        for a in answers
    ]


# ------------------------------------------------------------------ admin (Concierge Studio)
@router.post(
    "/concierge/preview",
    response_model=ConciergeEnvelope,
    tags=["concierge"],
    dependencies=[Depends(require(Permission.tenant_config_update.value))],
)
async def preview(
    body: PreviewIn,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    loyalty: LoyaltyDep,
    weather: WeatherDep,
    travel: TravelDep,
    llm: LlmDep,
) -> ConciergeEnvelope:
    """What-if brief for a seed player with candidate weights — no cache, no audit row."""
    query = select(Player).where(Player.tenant_id == tenant_id)
    if body.player_email:
        query = query.where(Player.email == body.player_email)
    seed_player = (
        (await session.execute(query.order_by(Player.created_at).limit(1))).scalars().first()
    )
    if seed_player is None:
        raise ProblemException(404, "No seed player", detail="Create a player first.")
    weights = ScoreWeights.from_config(body.weights) if body.weights else None
    envelope = await run_use_case(
        session,
        seed_player,
        llm,
        _ctx(session, seed_player, loyalty, weather, travel),
        "brief",
        weights_override=weights,
        record=False,
    )
    return ConciergeEnvelope.model_validate(envelope)


@router.get(
    "/concierge/answers",
    response_model=list[AdminAnswerOut],
    tags=["concierge"],
    dependencies=[Depends(require(Permission.audit_logs_read.value))],
)
async def recent_answers(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[AdminAnswerOut]:
    """Recent concierge answers for the tenant (the studio's audit view)."""
    answers = (
        (
            await session.execute(
                select(ConciergeAnswer)
                .where(ConciergeAnswer.tenant_id == tenant_id)
                .order_by(ConciergeAnswer.created_at.desc())
                .limit(50)
            )
        )
        .scalars()
        .all()
    )
    return [
        AdminAnswerOut(
            id=a.id,
            player_id=a.player_id,
            use_case=a.use_case,
            verdict=str(a.output.get("verdict", "")),
            fit_score=a.output.get("fit_score"),
            tools_called=[str(t) for t in a.tools_called],
            created_at=a.created_at,
        )
        for a in answers
    ]
