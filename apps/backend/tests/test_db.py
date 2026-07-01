"""Round-trip a trivial row through the async session to prove the DB layer works.

Uses a throwaway table (created and dropped within the test) so it does not depend on any domain
migration. Requires the docker Postgres to be up.
"""

from __future__ import annotations

import uuid

from app.db.base import BaseModel, TenantOwnedMixin
from app.db.session import SessionLocal, engine
from sqlalchemy import String, select
from sqlalchemy.orm import Mapped, mapped_column


class _Widget(TenantOwnedMixin, BaseModel):
    __tablename__ = "_test_widget"

    name: Mapped[str] = mapped_column(String(50), nullable=False)


async def test_session_round_trips_a_row(db_engine: object) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all, tables=[_Widget.__table__])
    try:
        tenant_id = uuid.uuid4()
        async with SessionLocal() as session:
            widget = _Widget(tenant_id=tenant_id, name="hello")
            session.add(widget)
            await session.commit()
            new_id = widget.id

        async with SessionLocal() as session:
            fetched = (
                await session.execute(select(_Widget).where(_Widget.id == new_id))
            ).scalar_one()
            assert fetched.name == "hello"
            assert fetched.tenant_id == tenant_id
            assert fetched.created_at is not None
            assert fetched.updated_at is not None
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(BaseModel.metadata.drop_all, tables=[_Widget.__table__])
