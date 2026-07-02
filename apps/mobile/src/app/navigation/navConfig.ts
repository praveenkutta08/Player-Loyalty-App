import { Gift, Home, Menu, ScanLine, User, Wallet } from 'lucide-react-native';

import { AccountNavigator } from '../../features/account/AccountNavigator';
import { HomeScreen } from '../../features/home/HomeScreen';
import { MoreNavigator } from '../../features/more/MoreNavigator';
import { OffersNavigator } from '../../features/offers/OffersNavigator';
import { WalletNavigator } from '../../features/wallet/WalletNavigator';

import type { MainTabParamList } from './types';
import type { ManifestNavigation } from '@repo/shared-types';
import type { LucideIcon } from 'lucide-react-native';

type TabRoute = keyof MainTabParamList;

/** Manifest tab/center keys → the fixed bottom-tab route names. */
const KEY_TO_ROUTE: Record<string, TabRoute> = {
  home: 'Home',
  offers: 'Offers',
  play: 'Play',
  scan: 'Play',
  'scan-play': 'Play',
  wallet: 'Play',
  account: 'Account',
  more: 'More',
};

/** Screen components are typed loosely — React Navigation injects each screen's props at render. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScreenComponent = React.ComponentType<any>;

/** Route → screen component. The set of destinations is fixed; the manifest chooses which to show. */
export const TAB_COMPONENTS: Record<TabRoute, ScreenComponent> = {
  Home: HomeScreen,
  Offers: OffersNavigator,
  Play: WalletNavigator,
  Account: AccountNavigator,
  More: MoreNavigator,
};

/** Manifest icon name → lucide icon, with a per-route default fallback. */
const ICON_BY_NAME: Record<string, LucideIcon> = {
  home: Home,
  gift: Gift,
  'scan-line': ScanLine,
  scan: ScanLine,
  play: ScanLine,
  wallet: Wallet,
  user: User,
  account: User,
  menu: Menu,
  more: Menu,
};

const DEFAULT_ICON: Record<TabRoute, LucideIcon> = {
  Home,
  Offers: Gift,
  Play: ScanLine,
  Account: User,
  More: Menu,
};

/** Default bottom nav (Option B) used when the manifest carries no `navigation` block. */
export const DEFAULT_NAV: ManifestNavigation = {
  tabs: [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'offers', label: 'Offers', icon: 'gift' },
    { key: 'play', label: 'Scan/Play', icon: 'scan-line' },
    { key: 'account', label: 'Account', icon: 'user' },
    { key: 'more', label: 'More', icon: 'menu' },
  ],
  centerAction: {
    key: 'play',
    label: 'Scan/Play',
    icon: 'scan-line',
    requiresFlag: 'cashless',
    fallback: 'wallet',
  },
  globals: { showNotifications: true, showSearch: true, showSupport: true },
};

export interface ResolvedTab {
  route: TabRoute;
  label: string;
  icon: LucideIcon;
  component: ScreenComponent;
  isCenter: boolean;
}

/**
 * Resolve the manifest navigation into an ordered, flag-filtered list of bottom tabs (P4.14 —
 * config-driven nav). `isEnabled` gates tabs by their `requiresFlag`; the center action is marked so
 * MainTabs can emphasize it. Unknown keys (no registered destination) are dropped.
 */
export function resolveTabs(
  nav: ManifestNavigation | undefined,
  isEnabled: (flag: string) => boolean,
): ResolvedTab[] {
  const config = nav && nav.tabs.length > 0 ? nav : DEFAULT_NAV;
  const centerRoute = config.centerAction ? KEY_TO_ROUTE[config.centerAction.key] : undefined;

  const seen = new Set<TabRoute>();
  const resolved: ResolvedTab[] = [];
  for (const tab of config.tabs) {
    const route = KEY_TO_ROUTE[tab.key];
    if (!route || seen.has(route)) continue;
    if (tab.requiresFlag && !isEnabled(tab.requiresFlag)) continue;
    seen.add(route);
    resolved.push({
      route,
      label: tab.label,
      icon: ICON_BY_NAME[tab.icon] ?? DEFAULT_ICON[route],
      component: TAB_COMPONENTS[route],
      isCenter: route === centerRoute,
    });
  }
  return resolved;
}
