import { kycView } from '../src/features/account/kyc';
import { TIER_LADDER, tierProgress } from '../src/features/account/tiers';

describe('tierProgress', () => {
  it('computes progress toward the next tier', () => {
    // Bronze (0) -> Silver (1000): 250 pts is a quarter of the way.
    const p = tierProgress(250, 'bronze');
    expect(p.current.key).toBe('bronze');
    expect(p.next?.key).toBe('silver');
    expect(p.pointsToNext).toBe(750);
    expect(p.ratio).toBeCloseTo(0.25);
  });

  it('caps ratio at 1 and pointsToNext at 0 for the top tier', () => {
    const top = TIER_LADDER[TIER_LADDER.length - 1];
    const p = tierProgress(999999, top.key);
    expect(p.next).toBeNull();
    expect(p.pointsToNext).toBe(0);
    expect(p.ratio).toBe(1);
  });

  it('falls back to the lowest tier for an unknown tier key', () => {
    const p = tierProgress(0, 'mystery');
    expect(p.current.key).toBe('bronze');
  });

  it('is case-insensitive on the tier key', () => {
    expect(tierProgress(0, 'GOLD').current.key).toBe('gold');
  });
});

describe('kycView', () => {
  it('marks verified players as done with no start action', () => {
    const v = kycView('verified');
    expect(v.tone).toBe('success');
    expect(v.canStart).toBe(false);
  });

  it('offers a restart for terminal failure states', () => {
    expect(kycView('rejected').canStart).toBe(true);
    expect(kycView('referred').canStart).toBe(true);
  });

  it('treats an unknown/empty status as not verified and startable', () => {
    const v = kycView(undefined);
    expect(v.tone).toBe('muted');
    expect(v.canStart).toBe(true);
  });
});
