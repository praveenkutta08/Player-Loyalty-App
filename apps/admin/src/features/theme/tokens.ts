import { nearestPairing, pairingByKey } from './pairings';

// A simplified, editable view over the freeform theme.tokens dict the backend stores. The mobile
// app consumes the full token tree from the manifest; here we edit the handful that define a brand.
//
// P7.2 retrofit: typography is a curated PAIRING (enum) — the old per-font selects (and the
// legacy tokens.navStyle, superseded by the manifest `navigation.style`) are gone. Font sizes
// and weights stay pack-driven token values, never per-tenant fields.
export interface BrandTokens {
  primary: string;
  gold: string;
  bg: string;
  surface: string;
  text: string;
  /** Curated typography pairing key (published via the appearance endpoint). */
  pairing: string;
}

export const DEFAULT_TOKENS: BrandTokens = {
  primary: '#E7DFCD',
  gold: '#E6B450',
  bg: '#0e0f13',
  surface: '#16181d',
  text: '#f2f3f5',
  pairing: 'bodoniManrope',
};

/** Read the editable brand tokens out of a stored theme tokens dict (with sensible fallbacks).
 * Legacy free-font configs (pre-P7.2) migrate to the NEAREST curated pairing. */
export function fromTokens(tokens: Record<string, unknown> | undefined): BrandTokens {
  const t = (tokens ?? {}) as Record<string, unknown>;
  const color = (t.color ?? {}) as Record<string, Record<string, string>>;
  const typography = (t.typography ?? {}) as Record<string, Record<string, string>>;
  return {
    primary: color.brand?.primary ?? DEFAULT_TOKENS.primary,
    gold: color.brand?.gold ?? DEFAULT_TOKENS.gold,
    bg: color.bg?.base ?? DEFAULT_TOKENS.bg,
    surface: color.bg?.surface ?? DEFAULT_TOKENS.surface,
    text: color.text?.primary ?? DEFAULT_TOKENS.text,
    pairing: nearestPairing(typography.fontFamily?.display, typography.fontFamily?.sans),
  };
}

/** Serialize the editable brand tokens back into the stored tokens dict shape. The pairing's
 * families are written for preview consistency; the manifest resolver re-applies the published
 * pairing server-side regardless. */
export function toTokens(b: BrandTokens): Record<string, unknown> {
  const fonts = pairingByKey(b.pairing);
  return {
    color: {
      brand: { primary: b.primary, gold: b.gold, accent: b.gold },
      bg: { base: b.bg, surface: b.surface },
      text: { primary: b.text },
    },
    typography: { fontFamily: { display: fonts.display, sans: fonts.sans } },
  };
}
