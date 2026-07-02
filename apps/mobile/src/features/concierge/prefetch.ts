import { conciergeApi } from './conciergeApi';

import type { AppDispatch } from '../../app/store';

/**
 * Prefetch the Home brief while the splash/session-restore is still on screen, so the hero is
 * already in the RTK Query cache when Home mounts — no spinner on Home (P6.6). No-op when the
 * tenant hasn't enabled the concierge flag.
 */
export function prefetchConciergeBrief(dispatch: AppDispatch, conciergeEnabled: boolean): boolean {
  if (!conciergeEnabled) return false;
  dispatch(conciergeApi.util.prefetch('getBrief', undefined, { ifOlderThan: 60 }));
  dispatch(conciergeApi.util.prefetch('getConciergeOffers', undefined, { ifOlderThan: 60 }));
  return true;
}
