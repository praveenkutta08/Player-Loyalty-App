import { describe, expect, it } from 'vitest';

import {
  DEFAULT_STUDIO_STATE,
  buildConciergeConfig,
  clamp01,
  parseConciergeConfig,
} from './studio';

import { NAV_ITEMS } from '@/app/nav';

describe('Concierge Studio state', () => {
  it('parses a stored config and round-trips through build', () => {
    const stored = {
      persona: { name: 'Ruby', tone: 'playful', accent_token: 'primary' },
      weights: { value_at_risk: 0.5, weather_fit: 0.2, travel_fit: 0.2, tier_urgency: 0.1 },
      guardrails: { quiet_hours_start: 23, quiet_hours_end: 7, frequency_cap_per_day: 2 },
    };
    const state = parseConciergeConfig(stored);
    expect(state.persona).toEqual({ name: 'Ruby', tone: 'playful', accentToken: 'primary' });
    expect(state.weights.value_at_risk).toBe(0.5);
    expect(state.guardrails).toEqual({ quietStart: 23, quietEnd: 7, frequencyCap: 2 });
    expect(buildConciergeConfig(state)).toEqual(stored);
  });

  it('falls back to defaults on missing/invalid values', () => {
    const state = parseConciergeConfig({
      persona: { name: '', tone: 'shouty', accent_token: 'neon' },
      weights: { value_at_risk: 7, weather_fit: 'x' },
      guardrails: { quiet_hours_start: 99, frequency_cap_per_day: -1 },
    });
    expect(state.persona).toEqual(DEFAULT_STUDIO_STATE.persona);
    expect(state.weights.value_at_risk).toBe(1); // clamped into [0,1]
    expect(state.weights.weather_fit).toBe(DEFAULT_STUDIO_STATE.weights.weather_fit);
    expect(state.guardrails.quietStart).toBe(DEFAULT_STUDIO_STATE.guardrails.quietStart);
    expect(state.guardrails.frequencyCap).toBe(DEFAULT_STUDIO_STATE.guardrails.frequencyCap);
    expect(parseConciergeConfig(undefined)).toEqual(DEFAULT_STUDIO_STATE);
  });

  it('clamps weights when serializing', () => {
    const state = parseConciergeConfig(undefined);
    state.weights.weather_fit = 3;
    const built = buildConciergeConfig(state) as { weights: Record<string, number> };
    expect(built.weights.weather_fit).toBe(1);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('Concierge Studio RBAC gating', () => {
  it('is in the nav, permission-gated on tenant_config:read', () => {
    const item = NAV_ITEMS.find((i) => i.path === '/concierge');
    expect(item).toBeDefined();
    expect(item?.permission).toBe('tenant_config:read');
    expect(item?.id).toBe('CON');
  });
});
