import {
  Banknote,
  Bell,
  Blocks,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Crown,
  FileText,
  Gamepad2,
  Hotel,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LifeBuoy,
  Languages,
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
  Car,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export type Scope = 'platform' | 'casino' | 'both';

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  scope: Scope;
  /** Permission string checked server-side + mirrored by <Can> (wired in P3.2). */
  permission: string;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        id: 'DSH',
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        scope: 'both',
        permission: 'dashboard:view',
      },
      {
        id: 'ANL',
        label: 'Analytics',
        path: '/analytics',
        icon: TrendingUp,
        scope: 'both',
        permission: 'analytics:view',
      },
    ],
  },
  {
    label: 'Casinos',
    items: [
      {
        id: 'CAS1',
        label: 'Casino Directory',
        path: '/casinos',
        icon: Building2,
        scope: 'platform',
        permission: 'tenant:read',
      },
      {
        id: 'FLG',
        label: 'Feature Flags',
        path: '/feature-flags',
        icon: SlidersHorizontal,
        scope: 'platform',
        permission: 'tenant:update',
      },
    ],
  },
  {
    label: 'Experience',
    items: [
      {
        id: 'HPB',
        label: 'Homepage Builder',
        path: '/homepage',
        icon: LayoutGrid,
        scope: 'casino',
        permission: 'content:update',
      },
      {
        id: 'NAV',
        label: 'Navigation Builder',
        path: '/navigation',
        icon: Navigation,
        scope: 'casino',
        permission: 'content:update',
      },
      {
        id: 'CNT',
        label: 'Content',
        path: '/content',
        icon: FileText,
        scope: 'both',
        permission: 'content:read',
      },
      {
        id: 'MED',
        label: 'Media Library',
        path: '/media',
        icon: Image,
        scope: 'both',
        permission: 'content:read',
      },
      {
        id: 'THM',
        label: 'Theme',
        path: '/theme',
        icon: Palette,
        scope: 'both',
        permission: 'theme:update',
      },
      {
        id: 'LOC',
        label: 'Localization',
        path: '/localization',
        icon: Languages,
        scope: 'both',
        permission: 'content:update',
      },
    ],
  },
  {
    label: 'Engagement',
    items: [
      {
        id: 'PRO1',
        label: 'Promotions',
        path: '/promotions',
        icon: CalendarClock,
        scope: 'both',
        permission: 'promotion:read',
      },
      {
        id: 'OFR',
        label: 'Offers',
        path: '/offers',
        icon: Ticket,
        scope: 'both',
        permission: 'offer:read',
      },
      {
        id: 'RWD1',
        label: 'Rewards',
        path: '/rewards',
        icon: Crown,
        scope: 'both',
        permission: 'reward:read',
      },
      {
        id: 'GAM',
        label: 'Games',
        path: '/games',
        icon: Gamepad2,
        scope: 'both',
        permission: 'game:read',
      },
      {
        id: 'NOT',
        label: 'Notifications',
        path: '/notifications',
        icon: Bell,
        scope: 'both',
        permission: 'notification:read',
      },
      {
        id: 'GEO1',
        label: 'Geofence Zones',
        path: '/geofencing',
        icon: MapPin,
        scope: 'both',
        permission: 'geo:read',
      },
      {
        id: 'SUP',
        label: 'Support Assistant',
        path: '/support',
        icon: LifeBuoy,
        scope: 'both',
        permission: 'support:update',
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        id: 'HTL',
        label: 'Hotel',
        path: '/hotel',
        icon: Hotel,
        scope: 'casino',
        permission: 'reservation:read',
      },
      {
        id: 'DIN',
        label: 'Dining',
        path: '/dining',
        icon: UtensilsCrossed,
        scope: 'casino',
        permission: 'reservation:read',
      },
      {
        id: 'ENT',
        label: 'Entertainment',
        path: '/entertainment',
        icon: PartyPopper,
        scope: 'casino',
        permission: 'reservation:read',
      },
      {
        id: 'VAL',
        label: 'Valet',
        path: '/valet',
        icon: Car,
        scope: 'casino',
        permission: 'reservation:read',
      },
      {
        id: 'RSV',
        label: 'Reservations',
        path: '/reservations',
        icon: CalendarClock,
        scope: 'casino',
        permission: 'reservation:read',
      },
    ],
  },
  {
    label: 'Players',
    items: [
      {
        id: 'MBR1',
        label: 'Members',
        path: '/members',
        icon: UsersRound,
        scope: 'both',
        permission: 'player:read',
      },
      {
        id: 'CMP',
        label: 'Compliance & RG',
        path: '/compliance',
        icon: ShieldCheck,
        scope: 'both',
        permission: 'compliance:read',
      },
      {
        id: 'PAY',
        label: 'Payments & Cashless',
        path: '/payments',
        icon: Banknote,
        scope: 'both',
        permission: 'wallet:read',
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        id: 'USR',
        label: 'Users & Roles',
        path: '/users',
        icon: UsersRound,
        scope: 'both',
        permission: 'admin:read',
      },
      {
        id: 'AUD',
        label: 'Audit & Publishing',
        path: '/audit',
        icon: ClipboardCheck,
        scope: 'both',
        permission: 'audit:read',
      },
      {
        id: 'SET',
        label: 'Settings & Integrations',
        path: '/settings',
        icon: Blocks,
        scope: 'both',
        permission: 'settings:update',
      },
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
