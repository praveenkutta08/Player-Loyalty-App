"""Notification services: compose, segment, send via PushPort, record deliveries.

``send`` is also used by the geofencing trigger engine (P2.8) to dispatch an offer to a player.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.push import PushNotification, PushPort
from ..players.models import Player
from .models import DeliveryStatus, Notification, NotificationDelivery, NotificationStatus
from .schemas import NotificationCreate


async def create_notification(
    session: AsyncSession, tenant_id: UUID, data: NotificationCreate
) -> Notification:
    status = (
        NotificationStatus.scheduled.value
        if data.schedule_at is not None
        else NotificationStatus.draft.value
    )
    notification = Notification(tenant_id=tenant_id, status=status, **data.model_dump())
    session.add(notification)
    await session.flush()
    return notification


async def list_notifications(session: AsyncSession, tenant_id: UUID) -> list[Notification]:
    return list(
        (
            await session.execute(
                select(Notification)
                .where(Notification.tenant_id == tenant_id)
                .order_by(Notification.created_at.desc())
            )
        )
        .scalars()
        .all()
    )


async def get_notification(session: AsyncSession, tenant_id: UUID, nid: UUID) -> Notification:
    n = (
        await session.execute(
            select(Notification).where(Notification.id == nid, Notification.tenant_id == tenant_id)
        )
    ).scalar_one_or_none()
    if n is None:
        raise ProblemException(404, "Notification not found")
    return n


async def select_targets(
    session: AsyncSession, tenant_id: UUID, segment: str | None
) -> list[Player]:
    query = select(Player).where(Player.tenant_id == tenant_id)
    if segment is not None and segment != "all":
        query = query.where(or_(Player.segment == segment))
    return list((await session.execute(query)).scalars().all())


async def send(
    session: AsyncSession,
    push: PushPort,
    notification: Notification,
    *,
    target_player_ids: Sequence[UUID] | None = None,
) -> tuple[int, int]:
    """Send a notification to its segment (or explicit players); record deliveries.

    Returns ``(delivered, total)``. Refuses to send before a future ``schedule_at``.
    """
    now = datetime.now(UTC)
    if notification.schedule_at is not None and notification.schedule_at > now:
        raise ProblemException(409, "Notification is scheduled for the future")

    if target_player_ids is not None:
        targets = list(
            (
                await session.execute(
                    select(Player).where(
                        Player.tenant_id == notification.tenant_id,
                        Player.id.in_(target_player_ids),
                    )
                )
            )
            .scalars()
            .all()
        )
    else:
        targets = await select_targets(session, notification.tenant_id, notification.segment)

    payload = PushNotification(
        title=notification.title,
        body=notification.body,
        data={k: str(v) for k, v in (notification.deep_link or {}).items()},
    )

    delivered = 0
    for player in targets:
        receipt = await push.send(str(player.id), payload)
        if receipt.delivered:
            delivered += 1
        session.add(
            NotificationDelivery(
                tenant_id=notification.tenant_id,
                notification_id=notification.id,
                player_id=player.id,
                status=(
                    DeliveryStatus.delivered.value
                    if receipt.delivered
                    else DeliveryStatus.failed.value
                ),
                receipt_ref=receipt.id,
                sent_at=now,
            )
        )

    notification.status = NotificationStatus.sent.value
    await session.flush()
    return delivered, len(targets)


async def list_deliveries(
    session: AsyncSession, tenant_id: UUID, nid: UUID
) -> list[NotificationDelivery]:
    return list(
        (
            await session.execute(
                select(NotificationDelivery).where(
                    NotificationDelivery.tenant_id == tenant_id,
                    NotificationDelivery.notification_id == nid,
                )
            )
        )
        .scalars()
        .all()
    )
