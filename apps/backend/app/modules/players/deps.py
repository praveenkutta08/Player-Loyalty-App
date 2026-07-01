"""Player audience dependency: resolve the current player from an ``aud=player`` token."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...core.security import AUDIENCE_PLAYER, TOKEN_ACCESS, decode_token
from ...db.session import get_session
from ...tenancy.deps import set_tenant_context
from .models import Player


async def get_current_player(
    session: Annotated[AsyncSession, Depends(get_session)],
    authorization: Annotated[str | None, Header()] = None,
) -> Player:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise ProblemException(401, "Not authenticated", detail="Missing bearer token.")
    token = authorization.split(" ", 1)[1].strip()

    payload = decode_token(token, audience=AUDIENCE_PLAYER, token_type=TOKEN_ACCESS)
    tenant_id = UUID(payload["tenant"])
    player_id = UUID(payload["sub"])

    # Bind the tenant so the lookup is RLS-scoped, then load the player.
    await set_tenant_context(session, tenant_id)
    player = await session.get(Player, player_id)
    if player is None:
        raise ProblemException(401, "Unknown player")
    return player
