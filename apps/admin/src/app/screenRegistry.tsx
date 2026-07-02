import type { ComponentType } from 'react';

import { CasinosScreen } from '@/features/casinos/CasinosScreen';
import { ContentScreen } from '@/features/content/ContentScreen';
import { FeatureFlagsScreen } from '@/features/featureflags/FeatureFlagsScreen';
import { GeofencingScreen } from '@/features/geofencing/GeofencingScreen';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
import { OffersScreen } from '@/features/offers/OffersScreen';
import { PromotionsScreen } from '@/features/promotions/PromotionsScreen';
import { ThemeScreen } from '@/features/theme/ThemeScreen';
import { UsersRolesScreen } from '@/features/users/UsersRolesScreen';

/**
 * Maps a nav path to its real screen component. Screens are added here as each Phase-3 prompt
 * builds them; any path without an entry falls back to the <Placeholder> in the router.
 */
export const SCREEN_REGISTRY: Record<string, ComponentType> = {
  '/casinos': CasinosScreen,
  '/content': ContentScreen,
  '/feature-flags': FeatureFlagsScreen,
  '/geofencing': GeofencingScreen,
  '/notifications': NotificationsScreen,
  '/offers': OffersScreen,
  '/promotions': PromotionsScreen,
  '/theme': ThemeScreen,
  '/users': UsersRolesScreen,
  // Remaining paths populated by P3.7–P3.19.
};
