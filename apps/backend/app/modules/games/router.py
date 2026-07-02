"""Games catalog endpoints: admin CMS CRUD (content:*) + app catalog/favorites/leaderboard."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ...adapters.factory import get_loyalty_port
from ...db.session import get_session
from ...ports.loyalty import LoyaltyPort
from ...rbac.deps import AdminContext, AdminTenantIdDep, AdminTenantSessionDep, require
from ...rbac.matrix import Permission
from ..audit.models import ActorType
from ..audit.service import write_audit
from ..players.deps import get_current_player
from ..players.models import Player
from .models import GameCategory
from .schemas import GameCreate, GameOut, GameUpdate, LeaderboardOut
from .service import (
    create_game,
    delete_game,
    leaderboard,
    list_games_admin,
    search_games,
    toggle_favorite,
    update_game,
)

router = APIRouter()

PlayerDep = Annotated[Player, Depends(get_current_player)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]
LoyaltyDep = Annotated[LoyaltyPort, Depends(get_loyalty_port)]


# ------------------------------------------------------------------ admin (CMS)
@router.get(
    "/games/admin",
    response_model=list[GameOut],
    tags=["games"],
    dependencies=[Depends(require(Permission.content_read.value))],
)
async def admin_list_games(
    session: AdminTenantSessionDep, tenant_id: AdminTenantIdDep
) -> list[GameOut]:
    return [GameOut.model_validate(g) for g in await list_games_admin(session, tenant_id)]


@router.post(
    "/games/admin",
    response_model=GameOut,
    status_code=status.HTTP_201_CREATED,
    tags=["games"],
)
async def admin_create_game(
    body: GameCreate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_create.value))],
) -> GameOut:
    game = await create_game(session, tenant_id, body)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="game:create",
        entity="game",
        entity_id=game.id,
    )
    return GameOut.model_validate(game)


@router.put(
    "/games/admin/{game_id}",
    response_model=GameOut,
    tags=["games"],
)
async def admin_update_game(
    game_id: uuid.UUID,
    body: GameUpdate,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_update.value))],
) -> GameOut:
    game = await update_game(session, tenant_id, game_id, body)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="game:update",
        entity="game",
        entity_id=game_id,
    )
    return GameOut.model_validate(game)


@router.delete(
    "/games/admin/{game_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["games"],
)
async def admin_delete_game(
    game_id: uuid.UUID,
    session: AdminTenantSessionDep,
    tenant_id: AdminTenantIdDep,
    ctx: Annotated[AdminContext, Depends(require(Permission.content_delete.value))],
) -> None:
    await delete_game(session, tenant_id, game_id)
    await write_audit(
        session,
        tenant_id=tenant_id,
        actor_type=ActorType.admin.value,
        actor_id=ctx.user.id,
        action="game:delete",
        entity="game",
        entity_id=game_id,
    )


# ------------------------------------------------------------------ app
@router.get("/games", response_model=list[GameOut], tags=["games"])
async def app_list_games(
    player: PlayerDep,
    session: SessionDep,
    category: GameCategory | None = None,
    q: str | None = None,
) -> list[GameOut]:
    games = await search_games(session, player.tenant_id, category=category, query=q)
    return [GameOut.model_validate(g) for g in games]


@router.get("/games/jackpot", response_model=list[GameOut], tags=["games"])
async def app_jackpot_games(player: PlayerDep, session: SessionDep) -> list[GameOut]:
    games = await search_games(session, player.tenant_id, jackpot_only=True)
    return [GameOut.model_validate(g) for g in games]


@router.post("/games/{game_id}/favorite", status_code=status.HTTP_204_NO_CONTENT, tags=["games"])
async def app_favorite(game_id: uuid.UUID, player: PlayerDep, session: SessionDep) -> None:
    # audit: exempt — player personal preference, not privileged/financial.
    await toggle_favorite(session, player, game_id, favorite=True)


@router.delete("/games/{game_id}/favorite", status_code=status.HTTP_204_NO_CONTENT, tags=["games"])
async def app_unfavorite(game_id: uuid.UUID, player: PlayerDep, session: SessionDep) -> None:
    # audit: exempt — player personal preference, not privileged/financial.
    await toggle_favorite(session, player, game_id, favorite=False)


@router.get("/leaderboard", response_model=LeaderboardOut, tags=["games"])
async def app_leaderboard(
    player: PlayerDep, session: SessionDep, loyalty: LoyaltyDep
) -> LeaderboardOut:
    return await leaderboard(session, loyalty, player)
