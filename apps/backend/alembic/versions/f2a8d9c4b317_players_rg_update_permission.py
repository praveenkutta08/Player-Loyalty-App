"""players:rg_update permission — audited responsible-gaming flag writes (audit H2).

Grants: super_admin, tenant_admin. Deliberately NOT account_manager/marketer_editor —
RG intervention is a tenant-compliance action.

Values are hardcoded (not imported from the live matrix) so this migration stays a frozen
snapshot even if the matrix evolves later.

Revision ID: f2a8d9c4b317
Revises: e9b5c7d2f416
Create Date: 2026-07-03
"""

from __future__ import annotations

from alembic import op

revision = "f2a8d9c4b317"
down_revision = "e9b5c7d2f416"
branch_labels = None
depends_on = None

PERMISSION_KEY = "players:rg_update"
GRANTED_ROLES = ("super_admin", "tenant_admin")


def upgrade() -> None:
    op.execute(
        "INSERT INTO permissions (id, key, resource, action) "
        f"VALUES (gen_random_uuid(), '{PERMISSION_KEY}', 'players', 'rg_update') "
        "ON CONFLICT (key) DO NOTHING"
    )
    for role_key in GRANTED_ROLES:
        op.execute(
            "INSERT INTO role_permissions (role_id, permission_id) "
            f"SELECT r.id, p.id FROM roles r, permissions p "
            f"WHERE r.key = '{role_key}' AND p.key = '{PERMISSION_KEY}' "
            "ON CONFLICT DO NOTHING"
        )


def downgrade() -> None:
    op.execute(
        "DELETE FROM role_permissions WHERE permission_id = "
        f"(SELECT id FROM permissions WHERE key = '{PERMISSION_KEY}')"
    )
    op.execute(f"DELETE FROM permissions WHERE key = '{PERMISSION_KEY}'")
