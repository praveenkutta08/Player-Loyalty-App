"""RLS isolation on the new concierge tables (P6.1): properties + player_preferences."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.concierge.models import PlayerPreference, Property
from app.tenancy.deps import set_tenant_context
from sqlalchemy import select

from ._helpers import create_player, create_tenant, unique


async def test_properties_and_preferences_are_rls_scoped(db_engine: object) -> None:
    tenant_a = await create_tenant(unique("rls-conc-a"))
    tenant_b = await create_tenant(unique("rls-conc-b"))
    player_a = await create_player(tenant_a.id, f"{unique('pa')}@example.com")
    player_b = await create_player(tenant_b.id, f"{unique('pb')}@example.com")

    # Seed both tenants as the owner (RLS bypassed).
    async with SessionLocal() as session:
        prop_a = Property(
            tenant_id=tenant_a.id,
            name=unique("Cascade Resort"),
            lat=36.11,
            lng=-115.17,
            amenities=["steakhouse", "spa"],
        )
        prop_b = Property(
            tenant_id=tenant_b.id, name=unique("Rival Casino"), lat=39.5, lng=-119.8
        )
        session.add_all([prop_a, prop_b])
        await session.flush()
        session.add_all(
            [
                PlayerPreference(
                    tenant_id=tenant_a.id,
                    player_id=player_a.id,
                    favorite_property_id=prop_a.id,
                    favorite_dining="steakhouse",
                    favorite_experiences=["slots", "shows"],
                ),
                PlayerPreference(tenant_id=tenant_b.id, player_id=player_b.id),
            ]
        )
        await session.commit()
        prop_a_id = prop_a.id

    # Under tenant A's RLS context only A's rows are visible.
    async with SessionLocal() as session:
        await set_tenant_context(session, tenant_a.id)

        properties = (await session.execute(select(Property))).scalars().all()
        assert [p.tenant_id for p in properties].count(tenant_b.id) == 0
        assert any(p.id == prop_a_id for p in properties)

        prefs = (await session.execute(select(PlayerPreference))).scalars().all()
        assert all(p.tenant_id == tenant_a.id for p in prefs)
        mine = next(p for p in prefs if p.player_id == player_a.id)
        assert mine.favorite_property_id == prop_a_id
        assert mine.favorite_experiences == ["slots", "shows"]
