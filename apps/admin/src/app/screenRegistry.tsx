import type { ComponentType } from 'react';

import { CasinosScreen } from '@/features/casinos/CasinosScreen';
import { FeatureFlagsScreen } from '@/features/featureflags/FeatureFlagsScreen';
import { UsersRolesScreen } from '@/features/users/UsersRolesScreen';

/**
 * Maps a nav path to its real screen component. Screens are added here as each Phase-3 prompt
 * builds them; any path without an entry falls back to the <Placeholder> in the router.
 */
export const SCREEN_REGISTRY: Record<string, ComponentType> = {
  '/casinos': CasinosScreen,
  '/feature-flags': FeatureFlagsScreen,
  '/users': UsersRolesScreen,
  // Remaining paths populated by P3.4–P3.19.
};
