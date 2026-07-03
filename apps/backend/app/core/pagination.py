"""Cursor pagination helpers.

Opaque, base64url-encoded cursors keep the wire format stable while letting the encoded payload
evolve. Domain services build a :class:`Page` from a query that fetches ``limit + 1`` rows to
detect whether more remain. Endpoints and models are filled in later phases.
"""

from __future__ import annotations

import base64
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute
from sqlalchemy.sql import Select

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100


def encode_cursor(value: str) -> str:
    """Encode an opaque cursor value (e.g. an id or timestamp) to a URL-safe string."""
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii").rstrip("=")


def decode_cursor(cursor: str) -> str:
    """Decode a cursor produced by :func:`encode_cursor`."""
    padding = "=" * (-len(cursor) % 4)
    return base64.urlsafe_b64decode(cursor + padding).decode("utf-8")


def clamp_limit(limit: int | None) -> int:
    """Clamp a client-supplied page size into the allowed range."""
    if limit is None:
        return DEFAULT_PAGE_SIZE
    return max(1, min(limit, MAX_PAGE_SIZE))


class Page[T](BaseModel):
    """A cursor-paginated response envelope (mirrors ``Paginated<T>`` in @repo/shared-types)."""

    items: list[T]
    next_cursor: str | None = None
    has_more: bool = False


async def paginate_keyset(
    session: AsyncSession,
    base_query: Select[Any],
    *,
    order_col: InstrumentedAttribute[datetime],
    id_col: InstrumentedAttribute[UUID],
    cursor: str | None,
    limit: int | None,
) -> Page[Any]:
    """Keyset-paginate ``base_query`` newest-first on ``(order_col DESC, id_col DESC)`` (M2).

    Keyset (not offset) so the page is stable under concurrent inserts and there is no deep-page
    scan. ``order_col`` is a datetime column (e.g. ``created_at`` / ``redeemed_at``) and ``id_col``
    is the UUID tiebreaker; the opaque cursor packs both. Fetches ``limit + 1`` rows to learn
    whether more remain. Returns ORM rows; the router serializes them into its ``*Page`` schema.
    """
    size = clamp_limit(limit)
    order_key = order_col.key
    id_key = id_col.key

    query = base_query
    if cursor:
        ts_raw, id_raw = decode_cursor(cursor).split("|", 1)
        after_ts = datetime.fromisoformat(ts_raw)
        after_id = UUID(id_raw)
        # Strictly "after" the cursor in (order DESC, id DESC): earlier order value, or same value
        # with a lower id.
        query = query.where(
            or_(order_col < after_ts, and_(order_col == after_ts, id_col < after_id))
        )

    query = query.order_by(order_col.desc(), id_col.desc()).limit(size + 1)
    rows = list((await session.execute(query)).scalars().all())

    has_more = len(rows) > size
    items = rows[:size]
    next_cursor: str | None = None
    if has_more and items:
        last = items[-1]
        order_value = getattr(last, order_key).isoformat()
        next_cursor = encode_cursor(f"{order_value}|{getattr(last, id_key)}")
    return Page(items=items, next_cursor=next_cursor, has_more=has_more)
