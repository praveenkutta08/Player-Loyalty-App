import type { ComponentType } from 'react';

import { CasinosScreen } from '@/features/casinos/CasinosScreen';
import { ContentScreen } from '@/features/content/ContentScreen';
import { FeatureFlagsScreen } from '@/features/featureflags/FeatureFlagsScreen';
import { GamesScreen } from '@/features/games/GamesScreen';
import { GeofencingScreen } from '@/features/geofencing/GeofencingScreen';
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen';
import { OffersScreen } from '@/features/offers/OffersScreen';
import { DiningScreen } from '@/features/operations/DiningScreen';
import { EntertainmentScreen } from '@/features/operations/EntertainmentScreen';
import { HotelScreen } from '@/features/operations/HotelScreen';
import { ReservationsScreen } from '@/features/operations/ReservationsScreen';
import { ValetScreen } from '@/features/operations/ValetScreen';
import { PromotionsScreen } from '@/features/promotions/PromotionsScreen';
import { RewardsScreen } from '@/features/rewards/RewardsScreen';
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
  '/rewards': RewardsScreen,
  '/games': GamesScreen,
  '/hotel': HotelScreen,
  '/dining': DiningScreen,
  '/entertainment': EntertainmentScreen,
  '/valet': ValetScreen,
  '/reservations': ReservationsScreen,
  '/theme': ThemeScreen,
  '/users': UsersRolesScreen,
  // Remaining paths populated by P3.10–P3.19.
};
