"""Aggregate router mounted under the ``/api/v1`` prefix.

Domain module routers (identity, tenants, content, offers, wallet, ...) are included here in
later phases. Empty for now — no domain models yet.
"""

from __future__ import annotations

from fastapi import APIRouter

from ...modules.content.router import router as content_router
from ...modules.identity.router import router as identity_router
from ...modules.players.router import router as players_router
from ...modules.tenant_config.router import router as tenant_config_router

api_router = APIRouter()
api_router.include_router(identity_router)
api_router.include_router(players_router)
api_router.include_router(tenant_config_router)
api_router.include_router(content_router)
