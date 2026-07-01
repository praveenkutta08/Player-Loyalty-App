"""Games catalog: search/filter, favorites, leaderboard including own rank."""

from __future__ import annotations

from httpx import AsyncClient

from ._helpers import admin_headers, create_tenant, player_token


async def _make_game(api: AsyncClient, admin: dict[str, str], **fields: object) -> str:
    created = await api.post("/api/v1/games/admin", headers=admin, json=fields)
    gid = created.json()["id"]
    await api.put(f"/api/v1/games/admin/{gid}", headers=admin, json={"status": "published"})
    return gid


async def test_search_filter_and_jackpot(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}

    await _make_game(api, admin, title="Golden Dragon", category="slots", is_jackpot=True)
    await _make_game(api, admin, title="Blackjack Classic", category="tables")

    all_games = (await api.get("/api/v1/games", headers=auth)).json()
    assert len(all_games) == 2

    slots = (await api.get("/api/v1/games?category=slots", headers=auth)).json()
    assert [g["title"] for g in slots] == ["Golden Dragon"]

    found = (await api.get("/api/v1/games?q=blackjack", headers=auth)).json()
    assert [g["title"] for g in found] == ["Blackjack Classic"]

    jackpot = (await api.get("/api/v1/games/jackpot", headers=auth)).json()
    assert [g["title"] for g in jackpot] == ["Golden Dragon"]


async def test_favorites_and_leaderboard(api: AsyncClient) -> None:
    tenant = await create_tenant()
    admin = await admin_headers(api, tenant_id=tenant.id)
    auth = {"Authorization": f"Bearer {await player_token(api, tenant.id)}"}
    # a second player so the leaderboard has more than one entry
    await player_token(api, tenant.id)

    game_id = await _make_game(api, admin, title="Slot A", category="slots")

    assert (await api.post(f"/api/v1/games/{game_id}/favorite", headers=auth)).status_code == 204
    assert (await api.delete(f"/api/v1/games/{game_id}/favorite", headers=auth)).status_code == 204

    board = (await api.get("/api/v1/leaderboard", headers=auth)).json()
    assert len(board["entries"]) >= 2
    assert board["me"] is not None
    assert 1 <= board["me"]["rank"] <= len(board["entries"])
