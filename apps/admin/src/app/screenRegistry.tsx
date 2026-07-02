import type { ComponentType } from 'react';

import { AnalyticsScreen } from '@/features/analytics/AnalyticsScreen';
import { DashboardScreen } from '@/features/analytics/DashboardScreen';
import { AuditScreen } from '@/features/audit/AuditScreen';
import { HomepageBuilder } from '@/features/builder/HomepageBuilder';
import { NavigationBuilder } from '@/features/builder/NavigationBuilder';
import { CasinosScreen } from '@/features/casinos/CasinosScreen';
import { ComplianceScreen } from '@/features/compliance/ComplianceScreen';
import { ContentScreen } from '@/features/content/ContentScreen';
import { FeatureFlagsScreen } from '@/features/featureflags/FeatureFlagsScreen';
import { GamesScreen } from '@/features/games/GamesScreen';
import { GeofencingScreen } from '@/features/geofencing/GeofencingScreen';
import { LocalizationScreen } from '@/features/localization/LocalizationScreen';
import { MediaLibraryScreen } from '@/features/media/MediaLibraryScreen';
import { MembersScreen } from '@/features/members/MembersScreen';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
import { OffersScreen } from '@/features/offers/OffersScreen';
import { DiningScreen } from '@/features/operations/DiningScreen';
import { EntertainmentScreen } from '@/features/operations/EntertainmentScreen';
import { HotelScreen } from '@/features/operations/HotelScreen';
import { ReservationsScreen } from '@/features/operations/ReservationsScreen';
import { ValetScreen } from '@/features/operations/ValetScreen';
import { PromotionsScreen } from '@/features/promotions/PromotionsScreen';
import { RewardsScreen } from '@/features/rewards/RewardsScreen';
import { PaymentsScreen } from '@/features/settings/PaymentsScreen';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { SupportScreen } from '@/features/support/SupportScreen';
import { ThemeScreen } from '@/features/theme/ThemeScreen';
import { UsersRolesScreen } from '@/features/users/UsersRolesScreen';

/**
 * Maps a nav path to its real screen component. Screens are added here as each Phase-3 prompt
 * builds them; any path without an entry falls back to the <Placeholder> in the router.
 */
export const SCREEN_REGISTRY: Record<string, ComponentType> = {
  '/dashboard': DashboardScreen,
  '/analytics': AnalyticsScreen,
  '/casinos': CasinosScreen,
  '/homepage': HomepageBuilder,
  '/navigation': NavigationBuilder,
  '/content': ContentScreen,
  '/media': MediaLibraryScreen,
  '/localization': LocalizationScreen,
  '/feature-flags': FeatureFlagsScreen,
  '/geofencing': GeofencingScreen,
  '/notifications': NotificationsScreen,
  '/offers': OffersScreen,
  '/promotions': PromotionsScreen,
  '/rewards': RewardsScreen,
  '/games': GamesScreen,
  '/support': SupportScreen,
  '/members': MembersScreen,
  '/compliance': ComplianceScreen,
  '/payments': PaymentsScreen,
  '/audit': AuditScreen,
  '/settings': SettingsScreen,
  '/hotel': HotelScreen,
  '/dining': DiningScreen,
  '/entertainment': EntertainmentScreen,
  '/valet': ValetScreen,
  '/reservations': ReservationsScreen,
  '/theme': ThemeScreen,
  '/users': UsersRolesScreen,
  // Remaining paths populated by P3.10–P3.19.
};
