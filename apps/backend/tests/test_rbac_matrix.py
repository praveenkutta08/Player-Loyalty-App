"""Spot-check the backend RBAC matrix against Appendix C + exhaustive Python<->TS parity (M8)."""

from __future__ import annotations

import json
from pathlib import Path

from app.rbac.matrix import ROLE_PERMISSIONS, Permission, Role, all_permissions, export_matrix

# Canonical matrix committed for the TS mirror; the admin vitest suite diffs rbac.ts against it.
_MATRIX_JSON = (
    Path(__file__).resolve().parents[3] / "packages" / "shared-types" / "rbac-matrix.json"
)


def test_permission_and_role_counts() -> None:
    assert len(all_permissions()) == 59
    assert len(ROLE_PERMISSIONS[Role.super_admin]) == 59
    assert len(ROLE_PERMISSIONS[Role.account_manager]) == 50
    assert len(ROLE_PERMISSIONS[Role.tenant_admin]) == 48
    assert len(ROLE_PERMISSIONS[Role.marketer_editor]) == 24


def test_rg_update_is_compliance_scoped() -> None:
    # H2: RG flag writes are for tenant admins (and super), never marketing.
    assert Permission.players_rg_update in ROLE_PERMISSIONS[Role.super_admin]
    assert Permission.players_rg_update in ROLE_PERMISSIONS[Role.tenant_admin]
    assert Permission.players_rg_update not in ROLE_PERMISSIONS[Role.marketer_editor]
    assert Permission.players_rg_update not in ROLE_PERMISSIONS[Role.account_manager]


def test_appendix_c_spot_checks() -> None:
    # Marketer/Editor: publish content but not delete it.
    assert Permission.content_publish in ROLE_PERMISSIONS[Role.marketer_editor]
    assert Permission.content_delete not in ROLE_PERMISSIONS[Role.marketer_editor]
    assert Permission.audit_logs_read not in ROLE_PERMISSIONS[Role.marketer_editor]

    # Tenant Admin: no tenant/platform management; admin_users without delete.
    assert Permission.tenants_create not in ROLE_PERMISSIONS[Role.tenant_admin]
    assert Permission.platform_config_read not in ROLE_PERMISSIONS[Role.tenant_admin]
    assert Permission.admin_users_delete not in ROLE_PERMISSIONS[Role.tenant_admin]
    assert Permission.admin_users_assign in ROLE_PERMISSIONS[Role.tenant_admin]

    # Account Manager: reads tenants but cannot create them.
    assert Permission.tenants_read in ROLE_PERMISSIONS[Role.account_manager]
    assert Permission.tenants_create not in ROLE_PERMISSIONS[Role.account_manager]


def test_python_matrix_matches_committed_json() -> None:
    """The live Python matrix must equal the committed canonical JSON (M8).

    If this fails after a matrix edit, regenerate with:
        uv run python -c "import json;from app.rbac.matrix import export_matrix;\
print(json.dumps(export_matrix(), indent=2))" > packages/shared-types/rbac-matrix.json
    """
    assert _MATRIX_JSON.exists(), f"missing canonical matrix at {_MATRIX_JSON}"
    committed = json.loads(_MATRIX_JSON.read_text(encoding="utf-8"))
    assert export_matrix() == committed, (
        "Python RBAC matrix drifted from packages/shared-types/rbac-matrix.json — "
        "regenerate the JSON and update shared-types/rbac.ts to match."
    )
