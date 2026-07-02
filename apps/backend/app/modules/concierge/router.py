"""Concierge endpoints (player audience, P6.3) — brief / offers / plan / ask / history.

The player dependency binds the RLS tenant context; every answer runs through the orchestrator
(guardrails → tools → scoring → narration → append-only audit row).
"""

from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import (
    get_llm_port,
    get_loyalty_port,
    get_travel_port,
    get_weather_port,
)
from ...db.session import get_session
from ...ports.llm import LlmPort
from ...ports.loyalty import LoyaltyPort
from ...ports.travel import TravelPort
from ...ports.weather import WeatherPort
from ..players.deps import get_current_player
from ..players.models import Player
from .schemas import (
    AnswerSummaryOut,
    AskIn,
    ConciergeEnvelope,
    ConciergeOffersOut,
    ConciergePlanOut,
    PlanIn,
)
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
