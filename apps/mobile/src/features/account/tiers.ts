/**
 * Loyalty tier ladder used for client-side tier-progress display. Thresholds mirror the admin
 * 5-tier model (P3.10); the server is the source of truth for the player's current tier, and this
 * only computes "points to next tier" for the UI.
 */
export interface Tier {
  key: string;
  label: string;
  threshold: number;
  benefits: string[];
}

export const TIER_LADDER: Tier[] = [
  { key: 'bronze', label: 'Bronze', threshold: 0, benefits: ['Member offers', 'Birthday reward'] },
  { key: 'silver', label: 'Silver', threshold: 1000, benefits: ['Priority support', '5% bonus points'] },
  { key: 'gold', label: 'Gold', threshold: 5000, benefits: ['Free valet', '10% bonus points', 'Lounge access'] },
  { key: 'platinum', label: 'Platinum', threshold: 15000, benefits: ['Host line', 'Suite upgrades', '15% bonus points'] },
  { key: 'diamond', label: 'Diamond', threshold: 50000, benefits: ['Dedicated host', 'Private events', '20% bonus points'] },
];

export interface TierProgress {
  current: Tier;
  next: Tier | null;
  /** Points still needed to reach `next` (0 at the top tier). */
  pointsToNext: number;
  /** 0..1 progress from the current threshold to the next. 1 at the top tier. */
  ratio: number;
}

/** Compute tier progress from a points balance and the server-provided current tier key. */
export function tierProgress(points: number, tierKey: string): TierProgress {
  const idx = Math.max(
    0,
    TIER_LADDER.findIndex((t) => t.key === tierKey.toLowerCase()),
  );
  const current = TIER_LADDER[idx] ?? TIER_LADDER[0];
  const next = TIER_LADDER[idx + 1] ?? null;
  if (!next) return { current, next: null, pointsToNext: 0, ratio: 1 };
  const span = next.threshold - current.threshold;
  const gained = Math.min(Math.max(points - current.threshold, 0), span);
  return {
    current,
    next,
    pointsToNext: Math.max(next.threshold - points, 0),
    ratio: span > 0 ? gained / span : 1,
  };
}
