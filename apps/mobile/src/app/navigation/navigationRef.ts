import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from './types';
import type { DeepLinkTarget } from '../../features/notifications/deepLinks';

/** Container ref so non-component code (the push bridge) can navigate on a notification tap. */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Route a resolved deep link into the nested navigators. Nested-navigation params are hard to type
 * precisely across the tab/stack tree, so the calls use loose casts at this single choke-point.
 */
export function navigateToTarget(target: DeepLinkTarget): void {
  if (!navigationRef.isReady()) return;
  const nav = navigationRef.navigate as (name: string, params?: unknown) => void;

  switch (target.kind) {
    case 'offers':
      nav('Main', {
        screen: 'Offers',
        params: { screen: 'OffersHome', params: { tab: target.segment } },
      });
      return;
    case 'reservation':
      nav('Main', {
        screen: 'More',
        params: { screen: 'ReservationDetail', params: { id: target.id } },
      });
      return;
    case 'message':
      nav('MessageDetail', { id: target.id });
      return;
    case 'home':
    default:
      nav('Main', { screen: 'Home' });
  }
}

/** Jump to the Scan/Play tab (cardless pairing entry) — used by a game's Play Now (P4.6/P4.11). */
export function navigateToScanPlay(): void {
  if (!navigationRef.isReady()) return;
  (navigationRef.navigate as (name: string, params?: unknown) => void)('Main', {
    screen: 'Play',
    params: { screen: 'ScanPlay' },
  });
}
