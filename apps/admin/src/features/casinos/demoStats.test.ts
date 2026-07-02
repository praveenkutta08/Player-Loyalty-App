import { describe, expect, it } from 'vitest';

import { formatUsd, propertyStats } from './demoStats';

describe('propertyStats', () => {
  it('is deterministic for a given tenant id', () => {
    expect(propertyStats('abc-123')).toEqual(propertyStats('abc-123'));
  });

  it('varies across tenant ids', () => {
    expect(propertyStats('tenant-a').members).not.toBe(propertyStats('tenant-b').members);
  });
});

describe('formatUsd', () => {
  it('formats cents as whole-dollar USD', () => {
    expect(formatUsd(1_234_500)).toBe('$12,345');
  });
});
