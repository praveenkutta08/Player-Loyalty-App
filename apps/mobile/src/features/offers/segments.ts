/** Offers-tab segment logic (P6.6): "For You" leads when the concierge flag is on. */

export type OffersSegment = 'foryou' | 'offers' | 'promotions' | 'rewards';

export interface SegmentDef {
  key: OffersSegment;
  label: string;
}

const BASE_SEGMENTS: SegmentDef[] = [
  { key: 'offers', label: 'Offers' },
  { key: 'promotions', label: 'Promotions' },
  { key: 'rewards', label: 'My Rewards' },
];

export function buildSegments(conciergeEnabled: boolean): SegmentDef[] {
  return conciergeEnabled ? [{ key: 'foryou', label: 'For You' }, ...BASE_SEGMENTS] : BASE_SEGMENTS;
}

/**
 * Initial segment: an explicit deep-link tab wins; otherwise "For You" when concierge is on
 * (the full list stays one segment away). A `foryou` deep link degrades to `offers` when the
 * flag is off — no dead ends.
 */
export function initialSegment(
  routeTab: OffersSegment | undefined,
  conciergeEnabled: boolean,
): OffersSegment {
  if (routeTab) {
    return routeTab === 'foryou' && !conciergeEnabled ? 'offers' : routeTab;
  }
  return conciergeEnabled ? 'foryou' : 'offers';
}
