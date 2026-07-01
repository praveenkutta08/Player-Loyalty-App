"""The demo seed populates a tenant and runs idempotently."""

from __future__ import annotations

from app.db.session import SessionLocal
from app.modules.tenants.models import Tenant
from app.seed import DEMO_SLUG, seed
from sqlalchemy import func, select


async def test_seed_is_idempotent(db_engine: object) -> None:
    await seed()
    await seed()  # second run must not duplicate

    async with SessionLocal() as session:
        count = (
            await session.execute(
                select(func.count()).select_from(Tenant).where(Tenant.slug == DEMO_SLUG)
            )
        ).scalar_one()
    assert count == 1
