/**
 * Role-Based Access Control — mirrors the Permissions Matrix (analysis Appendix C).
 *
 * GOLDEN RULE #2: authorization is enforced SERVER-SIDE. These enums are the shared source of
 * truth so the backend `require("resource:action")` checks, the admin `<Can permission="...">`
 * guard, and any client all speak the same vocabulary. Non-super roles are additionally scoped
 * to their tenant(s) by Postgres RLS, so "Tenant Admin" always means "within their own tenant".
 */

/** Admin-console roles (the mobile "player" audience is a separate token audience, not an admin role). */
export enum Role {
  SuperAdmin = 'super_admin',
  /** Super-admin scoped to a subset of clients (the Account Manager pattern). */
  AccountManager = 'account_manager',
  TenantAdmin = 'tenant_admin',
  MarketerEditor = 'marketer_editor',
}

/** Legend from Appendix C: C=create · R=read · U=update · D=delete · P=publish/send · A=assign roles. */
export enum Action {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Publish = 'publish',
  Assign = 'assign',
  /** Compliance: audited responsible-gaming flag writes (audit H2). */
  RgUpdate = 'rg_update',
}

/** Protected resources, matching the rows of the Permissions Matrix. */
export enum Resource {
  Tenants = 'tenants',
  PlatformConfig = 'platform_config',
  AdminUsers = 'admin_users',
  TenantConfig = 'tenant_config',
  Branding = 'branding',
  Content = 'content',
  Offers = 'offers',
  Promotions = 'promotions',
  PushCampaigns = 'push_campaigns',
  GeofenceZones = 'geofence_zones',
  LocationTriggers = 'location_triggers',
  Reservations = 'reservations',
  Players = 'players',
  Wallet = 'wallet',
  Analytics = 'analytics',
  AuditLogs = 'audit_logs',
}

/**
 * Every permission that any role can hold, as `resource:action`. This is the union of all cells
 * in Appendix C (only the actions that appear for at least one role are enumerated).
 */
export enum Permission {
  // Tenants (create/suspend)
  TenantsCreate = 'tenants:create',
  TenantsRead = 'tenants:read',
  TenantsUpdate = 'tenants:update',
  TenantsDelete = 'tenants:delete',

  // Platform config & adapter credentials
  PlatformConfigCreate = 'platform_config:create',
  PlatformConfigRead = 'platform_config:read',
  PlatformConfigUpdate = 'platform_config:update',
  PlatformConfigDelete = 'platform_config:delete',

  // Admin users & role assignment
  AdminUsersCreate = 'admin_users:create',
  AdminUsersRead = 'admin_users:read',
  AdminUsersUpdate = 'admin_users:update',
  AdminUsersDelete = 'admin_users:delete',
  AdminUsersAssign = 'admin_users:assign',

  // Tenant config, URLs & domains
  TenantConfigCreate = 'tenant_config:create',
  TenantConfigRead = 'tenant_config:read',
  TenantConfigUpdate = 'tenant_config:update',
  TenantConfigDelete = 'tenant_config:delete',

  // Theme / branding
  BrandingCreate = 'branding:create',
  BrandingRead = 'branding:read',
  BrandingUpdate = 'branding:update',
  BrandingDelete = 'branding:delete',

  // Content items
  ContentCreate = 'content:create',
  ContentRead = 'content:read',
  ContentUpdate = 'content:update',
  ContentDelete = 'content:delete',
  ContentPublish = 'content:publish',

  // Offers
  OffersCreate = 'offers:create',
  OffersRead = 'offers:read',
  OffersUpdate = 'offers:update',
  OffersDelete = 'offers:delete',
  OffersPublish = 'offers:publish',

  // Promotions
  PromotionsCreate = 'promotions:create',
  PromotionsRead = 'promotions:read',
  PromotionsUpdate = 'promotions:update',
  PromotionsDelete = 'promotions:delete',
  PromotionsPublish = 'promotions:publish',

  // Push campaigns
  PushCampaignsCreate = 'push_campaigns:create',
  PushCampaignsRead = 'push_campaigns:read',
  PushCampaignsUpdate = 'push_campaigns:update',
  PushCampaignsDelete = 'push_campaigns:delete',
  PushCampaignsPublish = 'push_campaigns:publish',

  // Geofence zones (points/beacons)
  GeofenceZonesCreate = 'geofence_zones:create',
  GeofenceZonesRead = 'geofence_zones:read',
  GeofenceZonesUpdate = 'geofence_zones:update',
  GeofenceZonesDelete = 'geofence_zones:delete',

  // Location triggers (rules)
  LocationTriggersCreate = 'location_triggers:create',
  LocationTriggersRead = 'location_triggers:read',
  LocationTriggersUpdate = 'location_triggers:update',
  LocationTriggersDelete = 'location_triggers:delete',
  LocationTriggersPublish = 'location_triggers:publish',

  // Reservations / valet config
  ReservationsCreate = 'reservations:create',
  ReservationsRead = 'reservations:read',
  ReservationsUpdate = 'reservations:update',
  ReservationsDelete = 'reservations:delete',

  // Players / PII
  PlayersRead = 'players:read',
  // Compliance: responsible-gaming flags (self-exclusion, cool-off, limits) — audited writes.
  PlayersRgUpdate = 'players:rg_update',

  // Wallet & transactions (view)
  WalletRead = 'wallet:read',

  // Analytics & reports
  AnalyticsRead = 'analytics:read',

  // Audit logs
  AuditLogsRead = 'audit_logs:read',
}

const P = Permission;

/**
 * The Permissions Matrix from Appendix C, encoded per role. This is the baseline for the backend
 * RBAC seed; the server remains the enforcement point.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.SuperAdmin]: [
    P.TenantsCreate,
    P.TenantsRead,
    P.TenantsUpdate,
    P.TenantsDelete,
    P.PlatformConfigCreate,
    P.PlatformConfigRead,
    P.PlatformConfigUpdate,
    P.PlatformConfigDelete,
    P.AdminUsersCreate,
    P.AdminUsersRead,
    P.AdminUsersUpdate,
    P.AdminUsersDelete,
    P.AdminUsersAssign,
    P.TenantConfigCreate,
    P.TenantConfigRead,
    P.TenantConfigUpdate,
    P.TenantConfigDelete,
    P.BrandingCreate,
    P.BrandingRead,
    P.BrandingUpdate,
    P.BrandingDelete,
    P.ContentCreate,
    P.ContentRead,
    P.ContentUpdate,
    P.ContentDelete,
    P.ContentPublish,
    P.OffersCreate,
    P.OffersRead,
    P.OffersUpdate,
    P.OffersDelete,
    P.OffersPublish,
    P.PromotionsCreate,
    P.PromotionsRead,
    P.PromotionsUpdate,
    P.PromotionsDelete,
    P.PromotionsPublish,
    P.PushCampaignsCreate,
    P.PushCampaignsRead,
    P.PushCampaignsUpdate,
    P.PushCampaignsDelete,
    P.PushCampaignsPublish,
    P.GeofenceZonesCreate,
    P.GeofenceZonesRead,
    P.GeofenceZonesUpdate,
    P.GeofenceZonesDelete,
    P.LocationTriggersCreate,
    P.LocationTriggersRead,
    P.LocationTriggersUpdate,
    P.LocationTriggersDelete,
    P.LocationTriggersPublish,
    P.ReservationsCreate,
    P.ReservationsRead,
    P.ReservationsUpdate,
    P.ReservationsDelete,
    P.PlayersRead,
    P.PlayersRgUpdate,
    P.WalletRead,
    P.AnalyticsRead,
    P.AuditLogsRead,
  ],
  [Role.AccountManager]: [
    P.TenantsRead,
    P.PlatformConfigRead,
    P.AdminUsersCreate,
    P.AdminUsersRead,
    P.AdminUsersUpdate,
    P.AdminUsersDelete,
    P.AdminUsersAssign,
    P.TenantConfigRead,
    P.TenantConfigUpdate,
    P.BrandingCreate,
    P.BrandingRead,
    P.BrandingUpdate,
    P.BrandingDelete,
    P.ContentCreate,
    P.ContentRead,
    P.ContentUpdate,
    P.ContentDelete,
    P.ContentPublish,
    P.OffersCreate,
    P.OffersRead,
    P.OffersUpdate,
    P.OffersDelete,
    P.OffersPublish,
    P.PromotionsCreate,
    P.PromotionsRead,
    P.PromotionsUpdate,
    P.PromotionsDelete,
    P.PromotionsPublish,
    P.PushCampaignsCreate,
    P.PushCampaignsRead,
    P.PushCampaignsUpdate,
    P.PushCampaignsDelete,
    P.PushCampaignsPublish,
    P.GeofenceZonesCreate,
    P.GeofenceZonesRead,
    P.GeofenceZonesUpdate,
    P.GeofenceZonesDelete,
    P.LocationTriggersCreate,
    P.LocationTriggersRead,
    P.LocationTriggersUpdate,
    P.LocationTriggersDelete,
    P.LocationTriggersPublish,
    P.ReservationsCreate,
    P.ReservationsRead,
    P.ReservationsUpdate,
    P.ReservationsDelete,
    P.PlayersRead,
    P.WalletRead,
    P.AnalyticsRead,
    P.AuditLogsRead,
  ],
  [Role.TenantAdmin]: [
    P.AdminUsersCreate,
    P.AdminUsersRead,
    P.AdminUsersUpdate,
    P.AdminUsersAssign,
    P.TenantConfigRead,
    P.TenantConfigUpdate,
    P.BrandingCreate,
    P.BrandingRead,
    P.BrandingUpdate,
    P.BrandingDelete,
    P.ContentCreate,
    P.ContentRead,
    P.ContentUpdate,
    P.ContentDelete,
    P.ContentPublish,
    P.OffersCreate,
    P.OffersRead,
    P.OffersUpdate,
    P.OffersDelete,
    P.OffersPublish,
    P.PromotionsCreate,
    P.PromotionsRead,
    P.PromotionsUpdate,
    P.PromotionsDelete,
    P.PromotionsPublish,
    P.PushCampaignsCreate,
    P.PushCampaignsRead,
    P.PushCampaignsUpdate,
    P.PushCampaignsDelete,
    P.PushCampaignsPublish,
    P.GeofenceZonesCreate,
    P.GeofenceZonesRead,
    P.GeofenceZonesUpdate,
    P.GeofenceZonesDelete,
    P.LocationTriggersCreate,
    P.LocationTriggersRead,
    P.LocationTriggersUpdate,
    P.LocationTriggersDelete,
    P.LocationTriggersPublish,
    P.ReservationsCreate,
    P.ReservationsRead,
    P.ReservationsUpdate,
    P.ReservationsDelete,
    P.PlayersRead,
    P.PlayersRgUpdate,
    P.WalletRead,
    P.AnalyticsRead,
    P.AuditLogsRead,
  ],
  [Role.MarketerEditor]: [
    P.BrandingRead,
    P.ContentCreate,
    P.ContentRead,
    P.ContentUpdate,
    P.ContentPublish,
    P.OffersCreate,
    P.OffersRead,
    P.OffersUpdate,
    P.OffersPublish,
    P.PromotionsCreate,
    P.PromotionsRead,
    P.PromotionsUpdate,
    P.PromotionsPublish,
    P.PushCampaignsCreate,
    P.PushCampaignsRead,
    P.PushCampaignsUpdate,
    P.PushCampaignsPublish,
    P.GeofenceZonesRead,
    P.LocationTriggersCreate,
    P.LocationTriggersRead,
    P.LocationTriggersUpdate,
    P.LocationTriggersPublish,
    P.ReservationsRead,
    P.AnalyticsRead,
  ],
};

/** Convenience predicate mirroring the server check. The server remains the real guard. */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
