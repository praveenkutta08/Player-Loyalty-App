"""Reusable audit + analytics hooks, plus read helpers for dashboards."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import AnalyticsEvent, AuditLog


async def write_audit(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    actor_type: str,
    actor_id: UUID | None,
    action: str,
    entity: str,
    entity_id: UUID | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Append an immutable audit row. Call from every privileged/financial/config mutation."""
    session.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            meta=meta,
            ts=datetime.now(UTC),
        )
    )
    await session.flush()


async def record_event(
    session: AsyncSession,
    *,
    tenant_id: UUID,
    type: str,
    player_id: UUID | None = None,
    entity_id: UUID | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    """Append a lightweight analytics event (offer views, redemptions, trigger fires, ...)."""
    session.add(
        AnalyticsEvent(
            tenant_id=tenant_id,
            type=type,
            player_id=player_id,
            entity_id=entity_id,
            meta=meta,
            ts=datetime.now(UTC),
        )
    )
    await session.flush()


async def list_audit(session: AsyncSession, tenant_id: UUID, limit: int = 100) -> list[AuditLog]:
    return list(
        (
            await session.execute(
                select(AuditLog)
                .where(AuditLog.tenant_id == tenant_id)
                .order_by(AuditLog.ts.desc())
                .limit(limit)
            )
        )
        .scalars()
        .all()
    )


async def analytics_summary(session: AsyncSession, tenant_id: UUID) -> dict[str, int]:
    rows = (
        await session.execute(
            select(AnalyticsEvent.type, func.count())
            .where(AnalyticsEvent.tenant_id == tenant_id)
            .group_by(AnalyticsEvent.type)
        )
    ).all()
    return {row[0]: int(row[1]) for row in rows}
