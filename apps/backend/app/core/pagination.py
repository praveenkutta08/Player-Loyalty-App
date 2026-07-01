"""Cursor pagination helpers.

Opaque, base64url-encoded cursors keep the wire format stable while letting the encoded payload
evolve. Domain services build a :class:`Page` from a query that fetches ``limit + 1`` rows to
detect whether more remain. Endpoints and models are filled in later phases.
"""

from __future__ import annotations

import base64

from pydantic import BaseModel

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
