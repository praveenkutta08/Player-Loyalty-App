import {
  canAfford,
  inStock,
  redeemOutcome,
  redeemOutcomeMessage,
} from '../src/features/rewards/redeem';

describe('reward redeem outcomes', () => {
  it('maps problem+json titles to outcomes', () => {
    expect(redeemOutcome({ data: { title: 'Insufficient points' } })).toBe('insufficient');
    expect(redeemOutcome({ data: { title: 'Reward is out of stock' } })).toBe('out_of_stock');
    expect(redeemOutcome({ data: { title: 'Reward is not available' } })).toBe('unavailable');
    expect(redeemOutcome({ data: { title: 'Boom' } })).toBe('error');
    expect(redeemOutcome(undefined)).toBe('error');
  });

  it('has a message for every outcome', () => {
    for (const o of ['insufficient', 'out_of_stock', 'unavailable', 'error'] as const) {
      expect(redeemOutcomeMessage(o).length).toBeGreaterThan(0);
    }
  });
});

describe('affordability + stock', () => {
  it('checks the points balance against the cost', () => {
    expect(canAfford(1000, 500)).toBe(true);
    expect(canAfford(400, 500)).toBe(false);
    expect(canAfford(500, 500)).toBe(true);
  });

  it('treats null stock as unlimited', () => {
    expect(inStock(null)).toBe(true);
    expect(inStock(undefined)).toBe(true);
    expect(inStock(3)).toBe(true);
    expect(inStock(0)).toBe(false);
  });
});
