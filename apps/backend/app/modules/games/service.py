"""Games catalog services + leaderboard ranking via LoyaltyPort."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.errors import ProblemException
from ...ports.loyalty import LoyaltyPort
from ..players.models import Player
from .models import Game, GameStatus, PlayerFavorite
from .schemas import GameCreate, GameUpdate, LeaderboardEntry, LeaderboardOut


# ------------------------------------------------------------------ admin CRUD
async def create_game(session: AsyncSession, tenant_id: UUID, data: GameCreate) -> Game:
    game = Game(tenant_id=tenant_id, **data.model_dump())
    session.add(game)
    await session.flush()
    return game


async def list_games_admin(session: AsyncSession, tenant_id: UUID) -> list[Game]:
    return list(
        (await session.execute(select(Game).where(Game.tenant_id == tenant_id))).scalars().all()
    )


async def get_game(session: AsyncSession, tenant_id: UUID, game_id: UUID) -> Game:
    game = (
        await session.execute(select(Game).where(Game.id == game_id, Game.tenant_id == tenant_id))
    ).scalar_one_or_none()
    if game is None:
        raise ProblemException(404, "Game not found")
    return game


async def update_game(
    session: AsyncSession, tenant_id: UUID, game_id: UUID, data: GameUpdate
) -> Game:
    game = await get_game(session, tenant_id, game_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(game, key, value)
    await session.flush()
    return game


async def delete_game(session: AsyncSession, tenant_id: UUID, game_id: UUID) -> None:
    game = await get_game(session, tenant_id, game_id)
    await session.delete(game)


# ------------------------------------------------------------------ app catalog
async def search_games(
    session: AsyncSession,
    tenant_id: UUID,
    category: str | None = None,
    query: str | None = None,
    jackpot_only: bool = False,
) -> list[Game]:
    stmt = select(Game).where(
        Game.tenant_id == tenant_id, Game.status == GameStatus.published.value
    )
    if category is not None:
        stmt = stmt.where(Game.category == category)
    if query:
        stmt = stmt.where(Game.title.ilike(f"%{query}%"))
    if jackpot_only:
        stmt = stmt.where(or_(Game.is_jackpot.is_(True), Game.featured.is_(True)))
    stmt = stmt.order_by(Game.sort_order.asc(), Game.title.asc())
    return list((await session.execute(stmt)).scalars().all())


async def toggle_favorite(
    session: AsyncSession, player: Player, game_id: UUID, favorite: bool
) -> None:
    await get_game(session, player.tenant_id, game_id)
    existing = (
        await session.execute(
            select(PlayerFavorite).where(
                PlayerFavorite.tenant_id == player.tenant_id,
                PlayerFavorite.player_id == player.id,
                PlayerFavorite.game_id == game_id,
            )
        )
    ).scalar_one_or_none()
    if favorite and existing is None:
        session.add(
            PlayerFavorite(tenant_id=player.tenant_id, player_id=player.id, game_id=game_id)
        )
    elif not favorite and existing is not None:
        await session.delete(existing)
    await session.flush()


# ------------------------------------------------------------------ leaderboard
async def leaderboard(
    session: AsyncSession, loyalty: LoyaltyPort, player: Player
) -> LeaderboardOut:
    players = list(
        (await session.execute(select(Player).where(Player.tenant_id == player.tenant_id)))
        .scalars()
        .all()
    )
    scored = [(p.id, (await loyalty.get_account(str(p.id))).points) for p in players]
    scored.sort(key=lambda item: (-item[1], str(item[0])))

    entries = [
        LeaderboardEntry(player_id=pid, points=points, rank=rank)
        for rank, (pid, points) in enumerate(scored, start=1)
    ]
    me = next((e for e in entries if e.player_id == player.id), None)
    return LeaderboardOut(entries=entries, me=me)
