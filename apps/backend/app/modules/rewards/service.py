"""Rewards services: idempotent redemption deducting LoyaltyPort points + stock."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.errors import AdapterRejectedError
from ...ports.loyalty import LoyaltyPort
from ..audit.service import record_event
from ..players.models import Player
from .models import RewardItem, RewardRedemption, RewardStatus
from .schemas import RewardItemCreate, RewardItemUpdate


# ------------------------------------------------------------------ admin CRUD
async def create_item(session: AsyncSession, tenant_id: UUID, data: RewardItemCreate) -> RewardItem:
    item = RewardItem(tenant_id=tenant_id, **data.model_dump())
    session.add(item)
    await session.flush()
    return item


async def list_items_admin(session: AsyncSession, tenant_id: UUID) -> list[RewardItem]:
    return list(
        (await session.execute(select(RewardItem).where(RewardItem.tenant_id == tenant_id)))
        .scalars()
        .all()
    )


async def get_item(session: AsyncSession, tenant_id: UUID, item_id: UUID) -> RewardItem:
    item = (
        await session.execute(
            select(RewardItem).where(RewardItem.id == item_id, RewardItem.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if item is None:
        raise ProblemException(404, "Reward not found")
    return item


async def update_item(
    session: AsyncSession, tenant_id: UUID, item_id: UUID, data: RewardItemUpdate
) -> RewardItem:
    item = await get_item(session, tenant_id, item_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    await session.flush()
    return item


async def delete_item(session: AsyncSession, tenant_id: UUID, item_id: UUID) -> None:
    item = await get_item(session, tenant_id, item_id)
    await session.delete(item)


# ------------------------------------------------------------------ app
async def list_published(session: AsyncSession, tenant_id: UUID) -> list[RewardItem]:
    return list(
        (
            await session.execute(
                select(RewardItem).where(
                    RewardItem.tenant_id == tenant_id,
                    RewardItem.status == RewardStatus.published.value,
                )
            )
        )
        .scalars()
        .all()
    )


async def list_my_redemptions(session: AsyncSession, player: Player) -> list[RewardRedemption]:
    return list(
        (
            await session.execute(
                select(RewardRedemption)
                .where(RewardRedemption.player_id == player.id)
                .order_by(RewardRedemption.redeemed_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def redeem(
    session: AsyncSession, loyalty: LoyaltyPort, player: Player, item_id: UUID, idem: str
) -> RewardRedemption:
    existing = (
        await session.execute(
            select(RewardRedemption).where(
                RewardRedemption.tenant_id == player.tenant_id,
                RewardRedemption.idempotency_key == idem,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing  # idempotent

    item = await get_item(session, player.tenant_id, item_id)
    if item.status != RewardStatus.published.value:
        raise ProblemException(409, "Reward is not available")
    if item.stock is not None and item.stock <= 0:
        raise ProblemException(409, "Reward is out of stock")

    account = await loyalty.get_account(str(player.id))
    if account.points < item.points_cost:
        raise ProblemException(409, "Insufficient points")

    try:
        await loyalty.redeem(str(player.id), item.points_cost, f"reward:{item.id}")
    except AdapterRejectedError as exc:
        raise ProblemException(409, "Insufficient points", detail=str(exc)) from exc

    if item.stock is not None:
        item.stock -= 1

    redemption = RewardRedemption(
        tenant_id=player.tenant_id,
        player_id=player.id,
        reward_item_id=item.id,
        points_spent=item.points_cost,
        status="completed",
        idempotency_key=idem,
        redeemed_at=datetime.now(UTC),
    )
    session.add(redemption)
    await session.flush()
    await record_event(
        session,
        tenant_id=player.tenant_id,
        type="reward_redemption",
        player_id=player.id,
        entity_id=item.id,
    )
    return redemption
