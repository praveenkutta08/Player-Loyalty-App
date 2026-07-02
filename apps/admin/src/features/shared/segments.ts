import type { Tone } from '@/components/ui';

// Player segments used for targeting across content, offers, promotions and notifications.
// "all" (or null) = everyone; others mirror the seed segments (vip/gold) plus common tiers.
export const SEGMENTS = ['all', 'vip', 'gold', 'silver', 'new'] as const;
export type Segment = (typeof SEGMENTS)[number];

export const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  published: 'green',
  archived: 'red',
  scheduled: 'gold',
  active: 'green',
  paused: 'gold',
  expired: 'red',
};
