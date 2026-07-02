import { Permission, Resource, Role, ROLE_PERMISSIONS } from '@repo/shared-types';

/** Human labels for the admin roles (the console mirror of ROLE_LABELS on the backend). */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.SuperAdmin]: 'Super-Admin',
  [Role.AccountManager]: 'Account Manager',
  [Role.TenantAdmin]: 'Tenant Admin',
  [Role.MarketerEditor]: 'Marketer / Editor',
};

/** Roles confined to their assigned tenants (everyone except the global super-admin). */
export const SCOPED_ROLES: ReadonlySet<Role> = new Set([
  Role.AccountManager,
  Role.TenantAdmin,
  Role.MarketerEditor,
]);

const RESOURCE_LABELS: Record<Resource, string> = {
  [Resource.Tenants]: 'Casinos / Tenants',
  [Resource.PlatformConfig]: 'Platform Config & Credentials',
  [Resource.AdminUsers]: 'Admin Users & Roles',
  [Resource.TenantConfig]: 'Tenant Config & Domains',
  [Resource.Branding]: 'Theme / Branding',
  [Resource.Content]: 'Content',
  [Resource.Offers]: 'Offers',
  [Resource.Promotions]: 'Promotions',
  [Resource.PushCampaigns]: 'Notifications / Push',
  [Resource.GeofenceZones]: 'Geofence Zones',
  [Resource.LocationTriggers]: 'Location Triggers',
  [Resource.Reservations]: 'Reservations / Operations',
  [Resource.Players]: 'Players / PII',
  [Resource.Wallet]: 'Wallet & Transactions',
  [Resource.Analytics]: 'Analytics',
  [Resource.AuditLogs]: 'Audit Logs',
};

export interface ResourceGrant {
  resource: Resource;
  label: string;
  actions: { action: string; granted: boolean }[];
}

const ALL_ACTIONS = ['create', 'read', 'update', 'delete', 'publish', 'assign'] as const;

/** Split a permission `resource:action`. */
function parts(permission: Permission): { resource: string; action: string } {
  const [resource, action] = permission.split(':');
  return { resource: resource!, action: action! };
}

/**
 * The full permission checklist for a role, grouped by resource — the Permissions Matrix view.
 * Derived from the shared ROLE_PERMISSIONS so it can never drift from the server's grants.
 */
export function roleMatrix(role: Role): ResourceGrant[] {
  const held = new Set(ROLE_PERMISSIONS[role]);
  return (Object.values(Resource) as Resource[]).map((resource) => {
    // Only actions that exist as a permission for at least one role are meaningful.
    const actions = ALL_ACTIONS.filter((action) =>
      (Object.values(Permission) as Permission[]).some((p) => {
        const pp = parts(p);
        return pp.resource === resource && pp.action === action;
      }),
    ).map((action) => ({
      action,
      granted: [...held].some((p) => {
        const pp = parts(p);
        return pp.resource === resource && pp.action === action;
      }),
    }));
    return { resource, label: RESOURCE_LABELS[resource], actions };
  });
}

export { Permission, Resource, Role, ROLE_PERMISSIONS };
