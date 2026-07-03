import { lazy } from 'react';

import type { ComponentType } from 'react';

/**
 * Maps a nav path to its real screen component. Every screen is route-level code-split with
 * React.lazy (M14) so the initial admin bundle only carries the shell + the landing route; each
 * feature area loads on first navigation. The router renders these inside a <Suspense> boundary.
 * A path without an entry falls back to the <Placeholder> in the router.
 *
 * Named exports are adapted to lazy()'s default-export contract via the `.then` mapper.
 */
const lazyScreen = <K extends string>(
  loader: () => Promise<Record<K, ComponentType>>,
  name: K,
): ComponentType =>
  lazy(async () => {
    const mod = await loader();
    return { default: mod[name] };
  }) as unknown as ComponentType;

export const SCREEN_REGISTRY: Record<string, ComponentType> = {
  '/dashboard': lazyScreen(() => import('@/features/analytics/DashboardScreen'), 'DashboardScreen'),
  '/analytics': lazyScreen(() => import('@/features/analytics/AnalyticsScreen'), 'AnalyticsScreen'),
  '/casinos': lazyScreen(() => import('@/features/casinos/CasinosScreen'), 'CasinosScreen'),
  '/homepage': lazyScreen(() => import('@/features/builder/HomepageBuilder'), 'HomepageBuilder'),
  '/navigation': lazyScreen(
    () => import('@/features/builder/NavigationBuilder'),
    'NavigationBuilder',
  ),
  '/content': lazyScreen(() => import('@/features/content/ContentScreen'), 'ContentScreen'),
  '/media': lazyScreen(() => import('@/features/media/MediaLibraryScreen'), 'MediaLibraryScreen'),
  '/localization': lazyScreen(
    () => import('@/features/localization/LocalizationScreen'),
    'LocalizationScreen',
  ),
  '/feature-flags': lazyScreen(
    () => import('@/features/featureflags/FeatureFlagsScreen'),
    'FeatureFlagsScreen',
  ),
  '/geofencing': lazyScreen(
    () => import('@/features/geofencing/GeofencingScreen'),
    'GeofencingScreen',
  ),
  '/concierge': lazyScreen(
    () => import('@/features/concierge/ConciergeStudioScreen'),
    'ConciergeStudioScreen',
  ),
  '/notifications': lazyScreen(
    () => import('@/features/notifications/NotificationsScreen'),
    'NotificationsScreen',
  ),
  '/offers': lazyScreen(() => import('@/features/offers/OffersScreen'), 'OffersScreen'),
  '/promotions': lazyScreen(
    () => import('@/features/promotions/PromotionsScreen'),
    'PromotionsScreen',
  ),
  '/rewards': lazyScreen(() => import('@/features/rewards/RewardsScreen'), 'RewardsScreen'),
  '/games': lazyScreen(() => import('@/features/games/GamesScreen'), 'GamesScreen'),
  '/support': lazyScreen(() => import('@/features/support/SupportScreen'), 'SupportScreen'),
  '/members': lazyScreen(() => import('@/features/members/MembersScreen'), 'MembersScreen'),
  '/compliance': lazyScreen(
    () => import('@/features/compliance/ComplianceScreen'),
    'ComplianceScreen',
  ),
  '/payments': lazyScreen(() => import('@/features/settings/PaymentsScreen'), 'PaymentsScreen'),
  '/audit': lazyScreen(() => import('@/features/audit/AuditScreen'), 'AuditScreen'),
  '/settings': lazyScreen(() => import('@/features/settings/SettingsScreen'), 'SettingsScreen'),
  '/hotel': lazyScreen(() => import('@/features/operations/HotelScreen'), 'HotelScreen'),
  '/dining': lazyScreen(() => import('@/features/operations/DiningScreen'), 'DiningScreen'),
  '/entertainment': lazyScreen(
    () => import('@/features/operations/EntertainmentScreen'),
    'EntertainmentScreen',
  ),
  '/valet': lazyScreen(() => import('@/features/operations/ValetScreen'), 'ValetScreen'),
  '/reservations': lazyScreen(
    () => import('@/features/operations/ReservationsScreen'),
    'ReservationsScreen',
  ),
  '/theme': lazyScreen(() => import('@/features/theme/ThemeScreen'), 'ThemeScreen'),
  '/users': lazyScreen(() => import('@/features/users/UsersRolesScreen'), 'UsersRolesScreen'),
  // Remaining paths populated by P3.10–P3.19.
};
