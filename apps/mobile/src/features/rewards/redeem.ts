/**
 * Map a rewards redeem failure (RFC 7807 problem+json from the API) to a UI outcome, so the
 * confirmation can show success / insufficient points / out of stock distinctly.
 */
export type RedeemOutcome = 'insufficient' | 'out_of_stock' | 'unavailable' | 'error';

export function redeemOutcome(err: unknown): RedeemOutcome {
  const data = (err as { data?: { title?: string; detail?: string } } | undefined)?.data;
  const message = `${data?.title ?? ''} ${data?.detail ?? ''}`.toLowerCase();
  if (message.includes('insufficient')) return 'insufficient';
  if (message.includes('stock')) return 'out_of_stock';
  if (message.includes('not available') || message.includes('unavailable')) return 'unavailable';
  return 'error';
}

export function redeemOutcomeMessage(outcome: RedeemOutcome): string {
  switch (outcome) {
    case 'insufficient':
      return 'You don’t have enough points for this reward yet.';
    case 'out_of_stock':
      return 'This reward is out of stock.';
    case 'unavailable':
      return 'This reward isn’t available right now.';
    default:
      return 'Redemption failed. Please try again.';
  }
}

/** True when the reward can't be redeemed given a points balance / stock. */
export function canAfford(pointsBalance: number, cost: number): boolean {
  return pointsBalance >= cost;
}

export function inStock(stock: number | null | undefined): boolean {
  return stock == null || stock > 0;
}
