"""Reusable audit + analytics hooks, plus read helpers for dashboards."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.pagination import Page, clamp_limit, decode_cursor, encode_cursor
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


def _audit_cursor(row: AuditLog) -> str:
    """Opaque keyset cursor for the (ts DESC, id DESC) ordering (M2)."""
    return encode_cursor(f"{row.ts.isoformat()}|{row.id}")


async def list_audit(
    session: AsyncSession, tenant_id: UUID, *, cursor: str | None = None, limit: int | None = None
) -> Page[AuditLog]:
    """Cursor-paginated audit feed, newest first. Keyset on (ts, id) — stable under inserts,
    no offset drift (M2). Fetches ``limit + 1`` to detect whether more remain."""
    size = clamp_limit(limit)
    query = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
    if cursor:
        ts_raw, id_raw = decode_cursor(cursor).split("|", 1)
        after_ts = datetime.fromisoformat(ts_raw)
        after_id = UUID(id_raw)
        # Rows strictly "after" the cursor in (ts DESC, id DESC): earlier ts, or same ts + lower id.
        query = query.where(
            or_(
                AuditLog.ts < after_ts,
                (AuditLog.ts == after_ts) & (AuditLog.id < after_id),
            )
        )
    query = query.order_by(AuditLog.ts.desc(), AuditLog.id.desc()).limit(size + 1)
    rows = list((await session.execute(query)).scalars().all())

    has_more = len(rows) > size
    items = rows[:size]
    next_cursor = _audit_cursor(items[-1]) if has_more and items else None
    return Page(items=items, next_cursor=next_cursor, has_more=has_more)


async def analytics_summary(session: AsyncSession, tenant_id: UUID) -> dict[str, int]:
    rows = (
        await session.execute(
            select(AnalyticsEvent.type, func.count())
            .where(AnalyticsEvent.tenant_id == tenant_id)
            .group_by(AnalyticsEvent.type)
        )
    ).all()
    return {row[0]: int(row[1]) for row in rows}
