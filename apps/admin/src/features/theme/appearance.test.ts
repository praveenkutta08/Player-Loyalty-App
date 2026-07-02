import { describe, expect, it } from 'vitest';

import { DEFAULT_PAIRING, nearestPairing, pairingByKey, TYPOGRAPHY_PAIRINGS } from './pairings';
import {
  buildSplashPayload,
  clampDuration,
  DEFAULT_SPLASH_STATE,
  parseSplash,
  type SplashState,
} from './splash';
import { fromTokens, toTokens } from './tokens';

describe('typography pairings (P7.2 retrofit)', () => {
  it('is a curated enum set — no free-form entries', () => {
    expect(TYPOGRAPHY_PAIRINGS.map((p) => p.key)).toEqual([
      'bodoniManrope',
      'marcellusManrope',
      'playfairInter',
      'cormorantWorkSans',
    ]);
    expect(pairingByKey('nope').key).toBe(DEFAULT_PAIRING); // unknown → default
  });

  it('migrates legacy free-font configs to the nearest pairing', () => {
    expect(nearestPairing('Bodoni Moda', 'Manrope')).toBe('bodoniManrope');
    expect(nearestPairing('Playfair Display', 'Manrope')).toBe('playfairInter'); // by display
    expect(nearestPairing('Comic Sans', 'Inter')).toBe('playfairInter'); // by sans
    expect(nearestPairing('Comic Sans', 'Papyrus')).toBe(DEFAULT_PAIRING); // no match
  });

  it('brand tokens round-trip through the pairing (no free-form fonts serialized)', () => {
    const state = fromTokens({
      typography: { fontFamily: { display: 'Marcellus', sans: 'Manrope' } },
    });
    expect(state.pairing).toBe('marcellusManrope');
    const tokens = toTokens(state) as {
      typography: { fontFamily: { display: string; sans: string } };
      navStyle?: unknown;
    };
    expect(tokens.typography.fontFamily).toEqual({ display: 'Marcellus', sans: 'Manrope' });
    expect(tokens.navStyle).toBeUndefined(); // legacy tokens.navStyle no longer written
  });
});

describe('splash form state (P7.2)', () => {
  it('clamps durations like the server (1800–3000)', () => {
    expect(clampDuration(5000)).toBe(3000);
    expect(clampDuration(1000)).toBe(1800);
    expect(clampDuration(2400)).toBe(2400);
  });

  it('parses stored config tolerantly and round-trips through the payload', () => {
    const state = parseSplash({
      variant: 'journey',
      environment_theme: 'desert',
      background_value: ['#111111', '#000000'],
      tagline_text: 'GRAND RESORT',
      animation_duration_ms: 2600,
      logo_asset_id: 'tenants/t1/content/x-logo.svg',
    });
    expect(state.variant).toBe('journey');
    expect(state.environmentTheme).toBe('desert');
    expect(buildSplashPayload(state)).toEqual({
      variant: 'journey',
      environment_theme: 'desert',
      background_value: ['#111111', '#000000'],
      tagline_text: 'GRAND RESORT',
      animation_duration_ms: 2600,
      logo_asset_id: 'tenants/t1/content/x-logo.svg',
    });
  });

  it('falls back to defaults on unknown/corrupt stored values', () => {
    const state = parseSplash({ variant: 'horizon', animation_duration_ms: 'bogus' });
    expect(state.variant).toBe('silk'); // documented fallback — horizon is not in MVP
    expect(state.durationMs).toBeNull();
    expect(parseSplash(undefined)).toEqual(DEFAULT_SPLASH_STATE);
  });

  it('only journey serializes an environment theme; native duration is omitted', () => {
    const silk: SplashState = { ...DEFAULT_SPLASH_STATE, environmentTheme: 'desert' };
    const payload = buildSplashPayload(silk);
    expect(payload.environment_theme).toBeUndefined();
    expect(payload.animation_duration_ms).toBeUndefined(); // null = variant native duration
  });
});
