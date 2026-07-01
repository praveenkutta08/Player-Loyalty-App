"""Spot-check the backend RBAC matrix against Appendix C (guards against drift)."""

from __future__ import annotations

from app.rbac.matrix import ROLE_PERMISSIONS, Permission, Role, all_permissions


def test_permission_and_role_counts() -> None:
    assert len(all_permissions()) == 58
    assert len(ROLE_PERMISSIONS[Role.super_admin]) == 58
    assert len(ROLE_PERMISSIONS[Role.account_manager]) == 50
    assert len(ROLE_PERMISSIONS[Role.tenant_admin]) == 47
    assert len(ROLE_PERMISSIONS[Role.marketer_editor]) == 24


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
