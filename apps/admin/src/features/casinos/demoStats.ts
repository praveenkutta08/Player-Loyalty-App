// Deterministic pseudo-metrics for the directory/detail cards. Real member counts and revenue
// come from the analytics endpoints (P3.19); tenant CRUD + property stats are not in the P1–P2
// backend surface, so these are derived from the tenant id to stay stable across renders.
function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export interface PropertyStats {
  members: number;
  revenueMtdCents: number;
  appVersion: string;
  activeOffers: number;
}

export function propertyStats(id: string): PropertyStats {
  const h = hash(id);
  return {
    members: 4000 + (h % 46000),
    revenueMtdCents: (500000 + (h % 4500000)) * 100,
    appVersion: `2.${h % 6}.${(h >> 3) % 9}`,
    activeOffers: 3 + (h % 12),
  };
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
