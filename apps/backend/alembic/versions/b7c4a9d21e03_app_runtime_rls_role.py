"""app_runtime login role — RLS-bound runtime DB user (audit C1).

The API must not connect as the `player` owner/superuser (superusers bypass RLS unconditionally,
so isolation would rest solely on every code path remembering `SET LOCAL ROLE app_rls`).
This migration creates a dedicated LOGIN role with NOSUPERUSER/NOBYPASSRLS that owns nothing:

- member of `app_rls` so the per-request `SET LOCAL ROLE app_rls` defense-in-depth keeps working
  (and, via INHERIT, it carries app_rls's per-table tenant grants);
- direct DML on all current tables (minus alembic_version) + sequence usage;
- default privileges so tables/sequences created by FUTURE migrations (run by the owner role)
  are automatically granted — no per-migration boilerplate.

Password comes from PG_APP_PASSWORD at migration time (default `app_runtime` for dev/CI);
rotate it out-of-band in real environments (`ALTER ROLE app_runtime PASSWORD ...`).

Revision ID: b7c4a9d21e03
Revises: 39a1c2a88bf0
Create Date: 2026-07-02
"""

from __future__ import annotations

import os

from alembic import op

revision = "b7c4a9d21e03"
down_revision = "39a1c2a88bf0"
branch_labels = None
depends_on = None

ROLE = "app_runtime"


def _password() -> str:
    # Single quotes doubled so the literal stays valid SQL.
    return os.environ.get("PG_APP_PASSWORD", "app_runtime").replace("'", "''")


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        f"IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{ROLE}') THEN "
        f"CREATE ROLE {ROLE} LOGIN PASSWORD '{_password()}'; "
        "END IF; END $$;"
    )
    # Enforce the fail-closed attributes even if the role pre-existed.
    op.execute(
        f"ALTER ROLE {ROLE} LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION"
    )
    op.execute(f"GRANT USAGE ON SCHEMA public TO {ROLE}")
    op.execute(f"GRANT app_rls TO {ROLE}")
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {ROLE}")
    op.execute(f"REVOKE ALL ON TABLE alembic_version FROM {ROLE}")
    op.execute(f"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {ROLE}")
    # Objects created by future migrations (same owner role runs them) auto-grant to the app.
    op.execute(
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public "
        f"GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {ROLE}"
    )
    op.execute(
        f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO {ROLE}"
    )


def downgrade() -> None:
    op.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM {ROLE}")
    op.execute(f"ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM {ROLE}")
    op.execute(f"REVOKE ALL ON ALL TABLES IN SCHEMA public FROM {ROLE}")
    op.execute(f"REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM {ROLE}")
    op.execute(f"REVOKE USAGE ON SCHEMA public FROM {ROLE}")
    op.execute(f"REVOKE app_rls FROM {ROLE}")
    op.execute(f"DROP ROLE IF EXISTS {ROLE}")
