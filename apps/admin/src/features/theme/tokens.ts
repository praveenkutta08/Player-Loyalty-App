// A simplified, editable view over the freeform theme.tokens dict the backend stores. The mobile
// app consumes the full token tree from the manifest; here we edit the handful that define a brand.
export interface BrandTokens {
  primary: string;
  gold: string;
  bg: string;
  surface: string;
  text: string;
  fontDisplay: string;
  fontBody: string;
  navStyle: 'tab' | 'floating' | 'minimal';
}

export const DEFAULT_TOKENS: BrandTokens = {
  primary: '#E7DFCD',
  gold: '#E6B450',
  bg: '#0e0f13',
  surface: '#16181d',
  text: '#f2f3f5',
  fontDisplay: 'Bodoni Moda',
  fontBody: 'Manrope',
  navStyle: 'tab',
};

/** Read the editable brand tokens out of a stored theme tokens dict (with sensible fallbacks). */
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
    fontDisplay: typography.fontFamily?.display ?? DEFAULT_TOKENS.fontDisplay,
    fontBody: typography.fontFamily?.sans ?? DEFAULT_TOKENS.fontBody,
    navStyle: (t.navStyle as BrandTokens['navStyle']) ?? DEFAULT_TOKENS.navStyle,
  };
}

/** Serialize the editable brand tokens back into the stored tokens dict shape. */
export function toTokens(b: BrandTokens): Record<string, unknown> {
  return {
    color: {
      brand: { primary: b.primary, gold: b.gold, accent: b.gold },
      bg: { base: b.bg, surface: b.surface },
      text: { primary: b.text },
    },
    typography: { fontFamily: { display: b.fontDisplay, sans: b.fontBody } },
    navStyle: b.navStyle,
  };
}

export const DISPLAY_FONTS = ['Bodoni Moda', 'Playfair Display', 'Cormorant', 'DM Serif Display'];
export const BODY_FONTS = ['Manrope', 'Inter', 'DM Sans', 'Work Sans'];
