"""Row-Level Security helpers (GOLDEN RULE #1 — tenant isolation via Postgres RLS).

Because the app connects as a superuser/owner in dev (which would *bypass* RLS), the runtime path
switches to a dedicated non-privileged role (``app_rls``) per request via ``SET LOCAL ROLE`` before
running tenant-scoped queries. Migrations create that role and call :func:`enable_rls_statements`
on every tenant-owned table.

These return lists of single statements because the async driver (asyncpg) executes one command
per call — callers loop and ``op.execute`` / ``session.execute`` each one.
"""

from __future__ import annotations

# Non-login role the request switches into so RLS is actually enforced.
APP_RLS_ROLE = "app_rls"

# Transaction-local GUC holding the current tenant id; policies compare against it.
TENANT_GUC = "app.current_tenant"

TENANT_ISOLATION_POLICY = "tenant_isolation"


def create_app_role_statements() -> list[str]:
    """Idempotently create the non-privileged RLS role and grant it schema usage."""
    return [
        (
            "DO $$ BEGIN "
            f"IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{APP_RLS_ROLE}') THEN "
            f"CREATE ROLE {APP_RLS_ROLE} NOLOGIN; "
            "END IF; END $$;"
        ),
        f"GRANT USAGE ON SCHEMA public TO {APP_RLS_ROLE};",
    ]


def enable_rls_statements(table: str) -> list[str]:
    """Enable + FORCE RLS on a tenant-owned table and add the tenant-isolation policy.

    FORCE ensures even the table owner is subject to the policy; the ``app_rls`` role is granted
    DML so the request path can operate under it.
    """
    return [
        f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;",
        f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;",
        f"DROP POLICY IF EXISTS {TENANT_ISOLATION_POLICY} ON {table};",
        (
            f"CREATE POLICY {TENANT_ISOLATION_POLICY} ON {table} "
            f"USING (tenant_id = current_setting('{TENANT_GUC}', true)::uuid) "
            f"WITH CHECK (tenant_id = current_setting('{TENANT_GUC}', true)::uuid);"
        ),
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON {table} TO {APP_RLS_ROLE};",
    ]


def disable_rls_statements(table: str) -> list[str]:
    """Reverse :func:`enable_rls_statements` (for migration downgrades)."""
    return [
        f"DROP POLICY IF EXISTS {TENANT_ISOLATION_POLICY} ON {table};",
        f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY;",
        f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;",
    ]
