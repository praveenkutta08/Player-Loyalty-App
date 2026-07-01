"""The RBAC permissions matrix — the backend mirror of analysis Appendix C.

This intentionally mirrors ``packages/shared-types/src/rbac.ts`` (same roles, permissions and
grants). Both derive from Appendix C; a test spot-checks parity to catch drift. The server is the
enforcement point (GOLDEN RULE #2).
"""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    super_admin = "super_admin"
    account_manager = "account_manager"
    tenant_admin = "tenant_admin"
    marketer_editor = "marketer_editor"


ROLE_LABELS: dict[Role, str] = {
    Role.super_admin: "Super-Admin",
    Role.account_manager: "Account Manager",
    Role.tenant_admin: "Tenant Admin",
    Role.marketer_editor: "Marketer / Editor",
}

# Only super_admin is unrestricted across tenants; every other role is confined to its
# admin_user_tenants allow-list.
UNRESTRICTED_ROLES: frozenset[Role] = frozenset({Role.super_admin})


class Permission(StrEnum):
    # Tenants (create/suspend)
    tenants_create = "tenants:create"
    tenants_read = "tenants:read"
    tenants_update = "tenants:update"
    tenants_delete = "tenants:delete"
    # Platform config & adapter credentials
    platform_config_create = "platform_config:create"
    platform_config_read = "platform_config:read"
    platform_config_update = "platform_config:update"
    platform_config_delete = "platform_config:delete"
    # Admin users & role assignment
    admin_users_create = "admin_users:create"
    admin_users_read = "admin_users:read"
    admin_users_update = "admin_users:update"
    admin_users_delete = "admin_users:delete"
    admin_users_assign = "admin_users:assign"
    # Tenant config, URLs & domains
    tenant_config_create = "tenant_config:create"
    tenant_config_read = "tenant_config:read"
    tenant_config_update = "tenant_config:update"
    tenant_config_delete = "tenant_config:delete"
    # Theme / branding
    branding_create = "branding:create"
    branding_read = "branding:read"
    branding_update = "branding:update"
    branding_delete = "branding:delete"
    # Content items
    content_create = "content:create"
    content_read = "content:read"
    content_update = "content:update"
    content_delete = "content:delete"
    content_publish = "content:publish"
    # Offers
    offers_create = "offers:create"
    offers_read = "offers:read"
    offers_update = "offers:update"
    offers_delete = "offers:delete"
    offers_publish = "offers:publish"
    # Promotions
    promotions_create = "promotions:create"
    promotions_read = "promotions:read"
    promotions_update = "promotions:update"
    promotions_delete = "promotions:delete"
    promotions_publish = "promotions:publish"
    # Push campaigns
    push_campaigns_create = "push_campaigns:create"
    push_campaigns_read = "push_campaigns:read"
    push_campaigns_update = "push_campaigns:update"
    push_campaigns_delete = "push_campaigns:delete"
    push_campaigns_publish = "push_campaigns:publish"
    # Geofence zones (points/beacons)
    geofence_zones_create = "geofence_zones:create"
    geofence_zones_read = "geofence_zones:read"
    geofence_zones_update = "geofence_zones:update"
    geofence_zones_delete = "geofence_zones:delete"
    # Location triggers (rules)
    location_triggers_create = "location_triggers:create"
    location_triggers_read = "location_triggers:read"
    location_triggers_update = "location_triggers:update"
    location_triggers_delete = "location_triggers:delete"
    location_triggers_publish = "location_triggers:publish"
    # Reservations / valet config
    reservations_create = "reservations:create"
    reservations_read = "reservations:read"
    reservations_update = "reservations:update"
    reservations_delete = "reservations:delete"
    # Players / PII
    players_read = "players:read"
    # Wallet & transactions (view)
    wallet_read = "wallet:read"
    # Analytics & reports
    analytics_read = "analytics:read"
    # Audit logs
    audit_logs_read = "audit_logs:read"


_P = Permission

ROLE_PERMISSIONS: dict[Role, tuple[Permission, ...]] = {
    Role.super_admin: (
        _P.tenants_create,
        _P.tenants_read,
        _P.tenants_update,
        _P.tenants_delete,
        _P.platform_config_create,
        _P.platform_config_read,
        _P.platform_config_update,
        _P.platform_config_delete,
        _P.admin_users_create,
        _P.admin_users_read,
        _P.admin_users_update,
        _P.admin_users_delete,
        _P.admin_users_assign,
        _P.tenant_config_create,
        _P.tenant_config_read,
        _P.tenant_config_update,
        _P.tenant_config_delete,
        _P.branding_create,
        _P.branding_read,
        _P.branding_update,
        _P.branding_delete,
        _P.content_create,
        _P.content_read,
        _P.content_update,
        _P.content_delete,
        _P.content_publish,
        _P.offers_create,
        _P.offers_read,
        _P.offers_update,
        _P.offers_delete,
        _P.offers_publish,
        _P.promotions_create,
        _P.promotions_read,
        _P.promotions_update,
        _P.promotions_delete,
        _P.promotions_publish,
        _P.push_campaigns_create,
        _P.push_campaigns_read,
        _P.push_campaigns_update,
        _P.push_campaigns_delete,
        _P.push_campaigns_publish,
        _P.geofence_zones_create,
        _P.geofence_zones_read,
        _P.geofence_zones_update,
        _P.geofence_zones_delete,
        _P.location_triggers_create,
        _P.location_triggers_read,
        _P.location_triggers_update,
        _P.location_triggers_delete,
        _P.location_triggers_publish,
        _P.reservations_create,
        _P.reservations_read,
        _P.reservations_update,
        _P.reservations_delete,
        _P.players_read,
        _P.wallet_read,
        _P.analytics_read,
        _P.audit_logs_read,
    ),
    Role.account_manager: (
        _P.tenants_read,
        _P.platform_config_read,
        _P.admin_users_create,
        _P.admin_users_read,
        _P.admin_users_update,
        _P.admin_users_delete,
        _P.admin_users_assign,
        _P.tenant_config_read,
        _P.tenant_config_update,
        _P.branding_create,
        _P.branding_read,
        _P.branding_update,
        _P.branding_delete,
        _P.content_create,
        _P.content_read,
        _P.content_update,
        _P.content_delete,
        _P.content_publish,
        _P.offers_create,
        _P.offers_read,
        _P.offers_update,
        _P.offers_delete,
        _P.offers_publish,
        _P.promotions_create,
        _P.promotions_read,
        _P.promotions_update,
        _P.promotions_delete,
        _P.promotions_publish,
        _P.push_campaigns_create,
        _P.push_campaigns_read,
        _P.push_campaigns_update,
        _P.push_campaigns_delete,
        _P.push_campaigns_publish,
        _P.geofence_zones_create,
        _P.geofence_zones_read,
        _P.geofence_zones_update,
        _P.geofence_zones_delete,
        _P.location_triggers_create,
        _P.location_triggers_read,
        _P.location_triggers_update,
        _P.location_triggers_delete,
        _P.location_triggers_publish,
        _P.reservations_create,
        _P.reservations_read,
        _P.reservations_update,
        _P.reservations_delete,
        _P.players_read,
        _P.wallet_read,
        _P.analytics_read,
        _P.audit_logs_read,
    ),
    Role.tenant_admin: (
        _P.admin_users_create,
        _P.admin_users_read,
        _P.admin_users_update,
        _P.admin_users_assign,
        _P.tenant_config_read,
        _P.tenant_config_update,
        _P.branding_create,
        _P.branding_read,
        _P.branding_update,
        _P.branding_delete,
        _P.content_create,
        _P.content_read,
        _P.content_update,
        _P.content_delete,
        _P.content_publish,
        _P.offers_create,
        _P.offers_read,
        _P.offers_update,
        _P.offers_delete,
        _P.offers_publish,
        _P.promotions_create,
        _P.promotions_read,
        _P.promotions_update,
        _P.promotions_delete,
        _P.promotions_publish,
        _P.push_campaigns_create,
        _P.push_campaigns_read,
        _P.push_campaigns_update,
        _P.push_campaigns_delete,
        _P.push_campaigns_publish,
        _P.geofence_zones_create,
        _P.geofence_zones_read,
        _P.geofence_zones_update,
        _P.geofence_zones_delete,
        _P.location_triggers_create,
        _P.location_triggers_read,
        _P.location_triggers_update,
        _P.location_triggers_delete,
        _P.location_triggers_publish,
        _P.reservations_create,
        _P.reservations_read,
        _P.reservations_update,
        _P.reservations_delete,
        _P.players_read,
        _P.wallet_read,
        _P.analytics_read,
        _P.audit_logs_read,
    ),
    Role.marketer_editor: (
        _P.branding_read,
        _P.content_create,
        _P.content_read,
        _P.content_update,
        _P.content_publish,
        _P.offers_create,
        _P.offers_read,
        _P.offers_update,
        _P.offers_publish,
        _P.promotions_create,
        _P.promotions_read,
        _P.promotions_update,
        _P.promotions_publish,
        _P.push_campaigns_create,
        _P.push_campaigns_read,
        _P.push_campaigns_update,
        _P.push_campaigns_publish,
        _P.geofence_zones_read,
        _P.location_triggers_create,
        _P.location_triggers_read,
        _P.location_triggers_update,
        _P.location_triggers_publish,
        _P.reservations_read,
        _P.analytics_read,
    ),
}


def all_permissions() -> list[Permission]:
    """Every distinct permission across the matrix, in declaration order."""
    return list(Permission)


def split_permission(permission: Permission) -> tuple[str, str]:
    """Return the ``(resource, action)`` parts of a permission key."""
    resource, action = permission.value.split(":", 1)
    return resource, action
