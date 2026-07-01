"""Prove Postgres RLS isolates tenants for select / update / delete (GOLDEN RULE #1).

Setup/verification run as the superuser owner (RLS bypassed) to seed both tenants' rows; the
assertions run under the ``app_rls`` role via the real ``set_tenant_context`` used by requests.
Requires the docker Postgres to be up.
"""

from __future__ import annotations

import uuid

from app.db.base import BaseModel, TenantOwnedMixin
from app.db.rls import disable_rls_statements, enable_rls_statements
from app.db.session import SessionLocal, engine
from app.tenancy.deps import set_tenant_context
from sqlalchemy import String, delete, select, text, update
from sqlalchemy.orm import Mapped, mapped_column

TENANT_A = uuid.uuid4()
TENANT_B = uuid.uuid4()


class _RlsWidget(TenantOwnedMixin, BaseModel):
    __tablename__ = "_test_rls_widget"

    name: Mapped[str] = mapped_column(String(50), nullable=False)


async def _create_table() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(BaseModel.metadata.create_all, tables=[_RlsWidget.__table__])
        for stmt in enable_rls_statements(_RlsWidget.__tablename__):
            await conn.execute(text(stmt))


async def _drop_table() -> None:
    async with engine.begin() as conn:
        for stmt in disable_rls_statements(_RlsWidget.__tablename__):
            await conn.execute(text(stmt))
        await conn.run_sync(BaseModel.metadata.drop_all, tables=[_RlsWidget.__table__])


async def test_rls_isolates_select_update_delete(db_engine: object) -> None:
    await _create_table()
    try:
        # Seed as the superuser owner (RLS bypassed): two rows for A, one for B.
        async with SessionLocal() as session:
            session.add_all(
                [
                    _RlsWidget(tenant_id=TENANT_A, name="a1"),
                    _RlsWidget(tenant_id=TENANT_A, name="a2"),
                    _RlsWidget(tenant_id=TENANT_B, name="b1"),
                ]
            )
            await session.commit()

        # Act under tenant A via the app_rls role — B must be invisible.
        async with SessionLocal() as session:
            await set_tenant_context(session, TENANT_A)

            visible = (await session.execute(select(_RlsWidget.name))).scalars().all()
            assert sorted(visible) == ["a1", "a2"]

            # An unfiltered UPDATE only touches rows visible under RLS (A's two rows).
            updated = await session.execute(update(_RlsWidget).values(name="updated"))
            assert updated.rowcount == 2

            # An unfiltered DELETE only removes A's rows; B is untouched.
            deleted = await session.execute(delete(_RlsWidget))
            assert deleted.rowcount == 2
            await session.commit()

        # Verify as superuser: B's row survived intact, A's rows are gone.
        async with SessionLocal() as session:
            rows = (
                await session.execute(select(_RlsWidget.tenant_id, _RlsWidget.name))
            ).all()
            assert len(rows) == 1
            assert rows[0].tenant_id == TENANT_B
            assert rows[0].name == "b1"
    finally:
        await _drop_table()
