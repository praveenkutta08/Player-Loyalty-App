"""Startup guards for the database connection (audit C1).

RLS is the tenant-isolation backstop (Golden Rule #1), and Postgres superusers / BYPASSRLS roles
skip it unconditionally — so booting the API on such a connection silently disables isolation.
The app lifespan calls :func:`assert_rls_bound_role` and refuses to start unless the connected
role is RLS-bound. Dev/tests may opt out explicitly with ALLOW_SUPERUSER_DB=1 (never honored
outside dev).
"""

from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from ..core.logging import get_logger
from ..core.settings import get_settings


async def assert_rls_bound_role() -> None:
    """Raise ``RuntimeError`` if the app's DB role can bypass row-level security.

    Uses a throwaway NullPool engine on the runtime DSN: the lifespan may run in a different
    event loop than request handlers (TestClient does), and a pooled connection checked out
    here would poison the shared engine's pool for that other loop.
    """
    settings = get_settings()
    engine = create_async_engine(settings.runtime_database_url, poolclass=NullPool)
    try:
        async with engine.connect() as conn:
            rolsuper, rolbypassrls = (
                await conn.execute(
                    text(
                        "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user"
                    )
                )
            ).one()
    finally:
        await engine.dispose()
    if not (rolsuper or rolbypassrls):
        return
    if settings.is_dev and settings.allow_superuser_db:
        get_logger("app").warning(
            "db_superuser_connection_allowed",
            detail="ALLOW_SUPERUSER_DB=1 (dev): RLS relies solely on SET LOCAL ROLE app_rls",
        )
        return
    raise RuntimeError(
        "Refusing to start: the database role is SUPERUSER/BYPASSRLS, which disables row-level "
        "security (audit C1). Set PG_APP_USER/PG_APP_PASSWORD to the app_runtime role created by "
        "migrations — or, in dev only, set ALLOW_SUPERUSER_DB=1."
    )
