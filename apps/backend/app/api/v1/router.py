"""Aggregate router mounted under the ``/api/v1`` prefix.

Domain module routers (identity, tenants, content, offers, wallet, ...) are included here in
later phases. Empty for now — no domain models yet.
"""

from __future__ import annotations

from fastapi import APIRouter

api_router = APIRouter()

# Later: api_router.include_router(identity.router), etc.
