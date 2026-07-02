// Pure splash form-state helpers (P7.2) — mirror of the backend's write validation so the UI
// rejects/clamps the same way the server does.

export const SPLASH_VARIANTS = ['journey', 'collection', 'portal', 'silk'] as const;
export type SplashVariantKey = (typeof SPLASH_VARIANTS)[number];

export const ENVIRONMENT_THEMES = ['coast', 'mountain', 'desert', 'skyline', 'forest'] as const;

export const DURATION_MIN_MS = 1800;
export const DURATION_MAX_MS = 3000;

export interface SplashState {
  variant: SplashVariantKey;
  logoAssetId?: string;
  backgroundTop: string;
  backgroundBottom: string;
  tagline: string;
  /** null = use the variant's native duration. */
  durationMs: number | null;
  environmentTheme: (typeof ENVIRONMENT_THEMES)[number];
}

export const VARIANT_META: Record<
  SplashVariantKey,
  { label: string; hint: string; nativeMs: number }
> = {
  journey: {
    label: 'Destination Journey',
    hint: 'Land rises; a path of light arrives at the brand.',
    nativeMs: 2600,
  },
  collection: {
    label: 'The Collection',
    hint: 'Loyalty-tier cards drop into a fanned stack.',
    nativeMs: 2400,
  },
  portal: {
    label: 'Luxury Portal',
    hint: 'An architectural aperture opens onto the brand.',
    nativeMs: 2400,
  },
  silk: {
    label: 'Silk Wave',
    hint: 'Ribbons of silk-light — the calm default.',
    nativeMs: 2200,
  },
};

export const DEFAULT_SPLASH_STATE: SplashState = {
  variant: 'silk',
  backgroundTop: '#241626',
  backgroundBottom: '#0A0710',
  tagline: '',
  durationMs: null,
  environmentTheme: 'coast',
};

export function clampDuration(ms: number): number {
  return Math.max(DURATION_MIN_MS, Math.min(DURATION_MAX_MS, Math.round(ms)));
}

/** Parse the stored appearance.splash dict into form state (tolerant, like the server read). */
export function parseSplash(raw: Record<string, unknown> | undefined): SplashState {
  const d = DEFAULT_SPLASH_STATE;
  if (!raw) return d;
  const variant = SPLASH_VARIANTS.includes(raw.variant as SplashVariantKey)
    ? (raw.variant as SplashVariantKey)
    : d.variant;
  const background = Array.isArray(raw.background_value) ? raw.background_value : [];
  return {
    variant,
    logoAssetId: typeof raw.logo_asset_id === 'string' ? raw.logo_asset_id : undefined,
    backgroundTop: typeof background[0] === 'string' ? background[0] : d.backgroundTop,
    backgroundBottom: typeof background[1] === 'string' ? background[1] : d.backgroundBottom,
    tagline: typeof raw.tagline_text === 'string' ? raw.tagline_text : '',
    durationMs:
      typeof raw.animation_duration_ms === 'number'
        ? clampDuration(raw.animation_duration_ms)
        : null,
    environmentTheme: ENVIRONMENT_THEMES.includes(
      raw.environment_theme as SplashState['environmentTheme'],
    )
      ? (raw.environment_theme as SplashState['environmentTheme'])
      : d.environmentTheme,
  };
}

/** Serialize form state to the snake_case write payload (duration clamped client-side too). */
export function buildSplashPayload(state: SplashState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    variant: state.variant,
    background_value: [state.backgroundTop, state.backgroundBottom],
  };
  if (state.logoAssetId) payload.logo_asset_id = state.logoAssetId;
  if (state.tagline.trim()) payload.tagline_text = state.tagline.trim();
  if (state.durationMs != null) payload.animation_duration_ms = clampDuration(state.durationMs);
  if (state.variant === 'journey') payload.environment_theme = state.environmentTheme;
  return payload;
}
