"""Audit C1 — RLS is enforced by the ROLE, not just the tenancy dependency.

Connects as the ``app_runtime`` login role created by migration ``b7c4a9d21e03`` and proves a
bare ``get_session``-style query on a tenant table returns ZERO rows without tenant context
(fail-closed), while setting only the tenant GUC (no ``SET ROLE``) makes rows visible again.
"""

from __future__ import annotations

import os
import uuid

import pytest
from app.core.settings import get_settings
from app.db.rls import APP_RUNTIME_ROLE, TENANT_GUC, enable_rls_statements
from app.db.session import engine as owner_engine
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine

PROBE_TABLE = "rls_role_probe"


def _runtime_url() -> str:
    """DATABASE_URL with the app_runtime credentials swapped in (matching runtime config)."""
    url = make_url(get_settings().database_url).set(
        username=os.environ.get("PG_APP_USER") or APP_RUNTIME_ROLE,
        password=os.environ.get("PG_APP_PASSWORD") or APP_RUNTIME_ROLE,
    )
    return url.render_as_string(hide_password=False)


@pytest.mark.asyncio
async def test_app_runtime_role_is_fail_closed(db_engine: object) -> None:
    tenant_id = uuid.uuid4()

    async with owner_engine.begin() as conn:
        row = (
            await conn.execute(
                text("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = :r"),
                {"r": APP_RUNTIME_ROLE},
            )
        ).one_or_none()
        assert row is not None, "migration b7c4a9d21e03 must create app_runtime"
        assert not row.rolsuper and not row.rolbypassrls

        await conn.execute(text(f"DROP TABLE IF EXISTS {PROBE_TABLE}"))
        await conn.execute(
            text(f"CREATE TABLE {PROBE_TABLE} (id serial PRIMARY KEY, tenant_id uuid NOT NULL)")
        )
        for stmt in enable_rls_statements(PROBE_TABLE):
            await conn.execute(text(stmt))
        # The migration's ON-ALL-TABLES grant predates this probe table — grant explicitly.
        await conn.execute(
            text(f"GRANT SELECT, INSERT ON {PROBE_TABLE} TO {APP_RUNTIME_ROLE}")
        )
        await conn.execute(
            text(f"INSERT INTO {PROBE_TABLE} (tenant_id) VALUES (:t)"), {"t": str(tenant_id)}
        )

    runtime_engine = create_async_engine(_runtime_url())
    try:
        # Bare query, no tenant context, no SET ROLE — must see nothing (fail-closed).
        async with runtime_engine.begin() as conn:
            bare_count = (
                await conn.execute(text(f"SELECT count(*) FROM {PROBE_TABLE}"))
            ).scalar_one()
        assert bare_count == 0

        # Bare INSERT without tenant context must be rejected by the policy's WITH CHECK.
        with pytest.raises(DBAPIError):
            async with runtime_engine.begin() as conn:
                await conn.execute(
                    text(f"INSERT INTO {PROBE_TABLE} (tenant_id) VALUES (:t)"),
                    {"t": str(uuid.uuid4())},
                )

        # Setting only the tenant GUC (no role switch) is enough — the login role is RLS-bound.
        async with runtime_engine.begin() as conn:
            await conn.execute(
                text(f"SELECT set_config('{TENANT_GUC}', :t, true)"), {"t": str(tenant_id)}
            )
            scoped_count = (
                await conn.execute(text(f"SELECT count(*) FROM {PROBE_TABLE}"))
            ).scalar_one()
        assert scoped_count == 1
    finally:
        await runtime_engine.dispose()
        async with owner_engine.begin() as conn:
            await conn.execute(text(f"DROP TABLE IF EXISTS {PROBE_TABLE}"))


@pytest.mark.asyncio
async def test_boot_guard_refuses_superuser_outside_dev(
    monkeypatch: pytest.MonkeyPatch, db_engine: object
) -> None:
    """Outside dev the app must refuse to boot on a SUPERUSER/BYPASSRLS connection."""
    from app.db import guards

    # Tests connect as the owner superuser (PG_APP_USER cleared in conftest) — pretend prod.
    prod_settings = get_settings().model_copy(
        update={"app_env": "prod", "allow_superuser_db": False}
    )
    monkeypatch.setattr(guards, "get_settings", lambda: prod_settings)
    with pytest.raises(RuntimeError, match="SUPERUSER/BYPASSRLS"):
        await guards.assert_rls_bound_role()

    # Even in dev, the escape hatch must be explicit.
    dev_settings = get_settings().model_copy(
        update={"app_env": "dev", "allow_superuser_db": False}
    )
    monkeypatch.setattr(guards, "get_settings", lambda: dev_settings)
    with pytest.raises(RuntimeError, match="SUPERUSER/BYPASSRLS"):
        await guards.assert_rls_bound_role()
