"""Concierge API schemas (P6.3) — the uniform answer envelope + per-endpoint wrappers."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ReasonOut(BaseModel):
    code: str
    chip: str
    detail: str
    source: str


class SignalOut(BaseModel):
    label: str
    value: str
    delta: str | None = None
    source: str


class CtaOut(BaseModel):
    label: str
    action: str


class ConciergeEnvelope(BaseModel):
    """Uniform envelope for every concierge answer, so mobile renders one way."""

    use_case: str
    verdict: str
    fit_score: int | None = None
    confidence: str
    reasons: list[ReasonOut]
    signals: list[SignalOut]
    sources: list[str]
    degraded: list[str]
    cta: CtaOut | None = None
    disclaimer: str
    generated_at: datetime
    cache_ttl_s: int


class RankedOfferOut(BaseModel):
    offer_id: str
    title: str
    kind: str
    score: float
    rank: int
    why_you: list[ReasonOut]


class ConciergeOffersOut(ConciergeEnvelope):
    items: list[RankedOfferOut]


class ItineraryStepOut(BaseModel):
    time: str
    title: str
    detail: str


class ConciergePlanOut(ConciergeEnvelope):
    itinerary: list[ItineraryStepOut]


class AskIn(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


class PlanIn(BaseModel):
    # Optional ISO date for the visit; defaults to today server-side.
    date: str | None = None


class AnswerSummaryOut(BaseModel):
    id: UUID
    use_case: str
    verdict: str
    created_at: datetime
