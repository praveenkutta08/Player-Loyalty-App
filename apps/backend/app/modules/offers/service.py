"""Offer/promotion services + targeted listing and idempotent redemption."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ..audit.service import record_event
from ..players.models import Player
from .models import Offer, OfferStatus, PlayerOffer, RedemptionStatus
from .schemas import OfferCreate, OfferUpdate


async def list_offers(session: AsyncSession, tenant_id: UUID, kind: str) -> list[Offer]:
    return list(
        (
            await session.execute(
                select(Offer)
                .where(Offer.tenant_id == tenant_id, Offer.kind == kind)
                .order_by(Offer.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def get_offer(session: AsyncSession, tenant_id: UUID, offer_id: UUID, kind: str) -> Offer:
    offer = (
        await session.execute(
            select(Offer).where(
                Offer.id == offer_id, Offer.tenant_id == tenant_id, Offer.kind == kind
            )
        )
    ).scalar_one_or_none()
    if offer is None:
        raise ProblemException(404, f"{kind} not found")
    return offer


async def create_offer(
    session: AsyncSession, tenant_id: UUID, kind: str, data: OfferCreate
) -> Offer:
    offer = Offer(tenant_id=tenant_id, kind=kind, **data.model_dump())
    session.add(offer)
    await session.flush()
    return offer


async def update_offer(
    session: AsyncSession, tenant_id: UUID, offer_id: UUID, kind: str, data: OfferUpdate
) -> Offer:
    offer = await get_offer(session, tenant_id, offer_id, kind)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(offer, key, value)
    await session.flush()
    return offer


async def delete_offer(session: AsyncSession, tenant_id: UUID, offer_id: UUID, kind: str) -> None:
    offer = await get_offer(session, tenant_id, offer_id, kind)
    await session.delete(offer)


async def publish_offer(session: AsyncSession, tenant_id: UUID, offer_id: UUID, kind: str) -> Offer:
    offer = await get_offer(session, tenant_id, offer_id, kind)
    offer.status = OfferStatus.published.value
    await session.flush()
    return offer


async def list_targeted(session: AsyncSession, player: Player, kind: str) -> list[Offer]:
    """Published, in-window offers of ``kind`` targeted at the player's segment."""
    now = datetime.now(UTC)
    segment_ok = or_(Offer.segment.is_(None), Offer.segment == "all")
    if player.segment is not None:
        segment_ok = or_(segment_ok, Offer.segment == player.segment)
    return list(
        (
            await session.execute(
                select(Offer)
                .where(
                    Offer.tenant_id == player.tenant_id,
                    Offer.kind == kind,
                    Offer.status == OfferStatus.published.value,
                    or_(Offer.start_at.is_(None), Offer.start_at <= now),
                    or_(Offer.end_at.is_(None), Offer.end_at >= now),
                    segment_ok,
                )
                .order_by(Offer.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def redeem(
    session: AsyncSession, player: Player, offer_id: UUID, idempotency_key: str | None
) -> PlayerOffer:
    """Idempotently redeem an offer for the player (one active redemption per offer)."""
    offer = (
        await session.execute(
            select(Offer).where(Offer.id == offer_id, Offer.tenant_id == player.tenant_id)
        )
    ).scalar_one_or_none()
    if offer is None:
        raise ProblemException(404, "Offer not found")
    if offer.status != OfferStatus.published.value:
        raise ProblemException(409, "Offer is not available")

    existing = (
        await session.execute(
            select(PlayerOffer).where(
                PlayerOffer.tenant_id == player.tenant_id,
                PlayerOffer.player_id == player.id,
                PlayerOffer.offer_id == offer_id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing  # idempotent: double-redeem returns the original ledger row

    redemption = PlayerOffer(
        tenant_id=player.tenant_id,
        player_id=player.id,
        offer_id=offer_id,
        status=RedemptionStatus.redeemed.value,
        redeemed_at=datetime.now(UTC),
        idempotency_key=idempotency_key,
    )
    session.add(redemption)
    await session.flush()
    await record_event(
        session,
        tenant_id=player.tenant_id,
        type="redemption",
        player_id=player.id,
        entity_id=offer_id,
    )
    return redemption
