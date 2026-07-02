import {
  Banknote,
  Bell,
  Blocks,
  Building2,
  CalendarClock,
  Car,
  ClipboardCheck,
  Crown,
  FileText,
  Gamepad2,
  Hotel,
  Image,
  Languages,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  MapPin,
  Navigation,
  Palette,
  PartyPopper,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  TrendingUp,
  UsersRound,
  UtensilsCrossed,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export type Scope = 'platform' | 'casino' | 'both';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  scope: Scope;
  /**
   * Server permission (resource:action from the Permissions Matrix) that gates this screen; the
   * <Can> guard and route guard mirror the server check. Undefined = any authenticated admin.
   * Screens without a dedicated matrix resource (rewards, games, support, media, homepage/nav
   * builders, localization, compliance) reuse the closest owning permission — noted inline.
   */
  permission?: string;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// prettier-ignore
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { id: 'DSH', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, scope: 'both' },
      { id: 'ANL', label: 'Analytics', path: '/analytics', icon: TrendingUp, scope: 'both', permission: 'analytics:read' },
    ],
  },
  {
    label: 'Casinos',
    items: [
      { id: 'CAS1', label: 'Casino Directory', path: '/casinos', icon: Building2, scope: 'platform', permission: 'tenants:read' },
      { id: 'FLG', label: 'Feature Flags', path: '/feature-flags', icon: SlidersHorizontal, scope: 'platform', permission: 'tenant_config:update' },
    ],
  },
  {
    label: 'Experience',
    items: [
      { id: 'HPB', label: 'Homepage Builder', path: '/homepage', icon: LayoutGrid, scope: 'casino', permission: 'content:update' },
      { id: 'NAV', label: 'Navigation Builder', path: '/navigation', icon: Navigation, scope: 'casino', permission: 'content:update' },
      { id: 'CNT', label: 'Content', path: '/content', icon: FileText, scope: 'both', permission: 'content:read' },
      { id: 'MED', label: 'Media Library', path: '/media', icon: Image, scope: 'both', permission: 'content:read' },
      { id: 'THM', label: 'Theme', path: '/theme', icon: Palette, scope: 'both', permission: 'branding:read' },
      { id: 'LOC', label: 'Localization', path: '/localization', icon: Languages, scope: 'both', permission: 'content:update' },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { id: 'PRO1', label: 'Promotions', path: '/promotions', icon: CalendarClock, scope: 'both', permission: 'promotions:read' },
      { id: 'OFR', label: 'Offers', path: '/offers', icon: Ticket, scope: 'both', permission: 'offers:read' },
      { id: 'RWD1', label: 'Rewards', path: '/rewards', icon: Crown, scope: 'both', permission: 'content:read' },
      { id: 'GAM', label: 'Games', path: '/games', icon: Gamepad2, scope: 'both', permission: 'content:read' },
      { id: 'NOT', label: 'Notifications', path: '/notifications', icon: Bell, scope: 'both', permission: 'push_campaigns:read' },
      { id: 'GEO1', label: 'Geofence Zones', path: '/geofencing', icon: MapPin, scope: 'both', permission: 'geofence_zones:read' },
      { id: 'SUP', label: 'Support Assistant', path: '/support', icon: LifeBuoy, scope: 'both', permission: 'content:update' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'HTL', label: 'Hotel', path: '/hotel', icon: Hotel, scope: 'casino', permission: 'reservations:read' },
      { id: 'DIN', label: 'Dining', path: '/dining', icon: UtensilsCrossed, scope: 'casino', permission: 'reservations:read' },
      { id: 'ENT', label: 'Entertainment', path: '/entertainment', icon: PartyPopper, scope: 'casino', permission: 'reservations:read' },
      { id: 'VAL', label: 'Valet', path: '/valet', icon: Car, scope: 'casino', permission: 'reservations:read' },
      { id: 'RSV', label: 'Reservations', path: '/reservations', icon: CalendarClock, scope: 'casino', permission: 'reservations:read' },
    ],
  },
  {
    label: 'Players',
    items: [
      { id: 'MBR1', label: 'Members', path: '/members', icon: UsersRound, scope: 'both', permission: 'players:read' },
      { id: 'CMP', label: 'Compliance & RG', path: '/compliance', icon: ShieldCheck, scope: 'both', permission: 'players:read' },
      { id: 'PAY', label: 'Payments & Cashless', path: '/payments', icon: Banknote, scope: 'both', permission: 'wallet:read' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { id: 'USR', label: 'Users & Roles', path: '/users', icon: UsersRound, scope: 'both', permission: 'admin_users:read' },
      { id: 'AUD', label: 'Audit & Publishing', path: '/audit', icon: ClipboardCheck, scope: 'both', permission: 'audit_logs:read' },
      { id: 'SET', label: 'Settings & Integrations', path: '/settings', icon: Blocks, scope: 'both', permission: 'platform_config:read' },
    ],
  },
];

/** Flatten to a lookup by path (used by the topbar breadcrumb + router). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function groupsForScope(scope: Scope): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => it.scope === 'both' || it.scope === scope),
  })).filter((g) => g.items.length > 0);
}

export const BRAND_ICON: LucideIcon = Sparkles;
