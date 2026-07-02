// Deterministic performance figures for offer/promotion cards. Real redemption + funnel data
// comes from analytics (P3.19); derived from the id so the numbers stay stable across renders.
export interface Perf {
  views: number;
  redeemed: number;
  conversion: string;
}

export function perf(id: string): Perf {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const views = 1200 + (h % 18000);
  const redeemed = Math.round(views * (0.04 + (h % 20) / 100));
  return { views, redeemed, conversion: `${((redeemed / views) * 100).toFixed(1)}%` };
}
