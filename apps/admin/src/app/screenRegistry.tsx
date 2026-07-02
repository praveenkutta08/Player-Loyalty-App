import type { ComponentType } from 'react';

import { UsersRolesScreen } from '@/features/users/UsersRolesScreen';

/**
 * Maps a nav path to its real screen component. Screens are added here as each Phase-3 prompt
 * builds them; any path without an entry falls back to the <Placeholder> in the router.
 */
export const SCREEN_REGISTRY: Record<string, ComponentType> = {
  '/users': UsersRolesScreen,
  // Remaining paths populated by P3.3–P3.19.
};
