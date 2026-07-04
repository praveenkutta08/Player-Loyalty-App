import { Platform } from 'react-native';

import { buildConfig } from '../../config/buildConfig';
import { deepMerge } from '../../lib/deepMerge';
import { DEFAULT_THEME } from '../../theme/tokens';

import type { components } from '@repo/api-client';
import type {
  FeatureFlags,
  ManifestConcierge,
  ManifestNavigation,
  ThemeTokens,
} from '@repo/shared-types';

/** Raw manifest as served by the backend (snake_case, possibly partial `theme`).
 * Fully typed in the OpenAPI contract since M6 — the generated schema is the wire-format
 * source of truth; this module only camelCases + defaults into the app's resolved shape. */
export type ManifestOut = components['schemas']['ManifestOut'];
type WireNavigation = components['schemas']['ManifestNavigation'];
type WireConcierge = components['schemas']['ManifestConcierge'];

/** The manifest after normalization: camelCase, theme merged over defaults, platform-resolved URL. */
export interface ResolvedManifest {
  version: number;
  tenantId: string;
  tenantSlug: string;
  name: string;
  theme: ThemeTokens;
  /** Tenant-forced color scheme (`theme.mode` in the manifest). `undefined`/`system` = follow OS. */
  themeMode?: 'dark' | 'light' | 'system';
  featureFlags: FeatureFlags;
  navigation?: ManifestNavigation;
  /** Concierge persona (P6.5); the `concierge` feature flag gates the UI. */
  concierge?: ManifestConcierge;
  /** Raw manifest `splash` block (P7.3) — consumed by resolveSplashConfig (snake_case kept). */
  splash?: Record<string, unknown>;
  /** Force-update floor (G8/M16): builds below this version route to ForceUpdateScreen. */
  minAppVersion?: string;
  apiBaseUrl: string;
  etag?: string;
  updatedAt?: string;
}

/**
 * Android emulators can't reach the host via `localhost` (that's the emulator itself); rewrite to
 * 10.0.2.2 so a dev manifest pointing at localhost still works. Other hosts pass through.
 */
export function resolveApiBaseUrl(url?: string): string {
  if (!url) return buildConfig.apiBaseUrl;
  if (Platform.OS === 'android') {
    return url.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }
  return url;
}

function coerceFlags(raw: Record<string, boolean> | undefined): FeatureFlags {
  const out: FeatureFlags = {};
  for (const [key, value] of Object.entries(raw ?? {})) out[key] = value === true;
  return out;
}

/** snake_case wire navigation → the app's camelCase resolved shape (defaults only — the wire
 * types come straight from the generated OpenAPI schema since M6, no hand re-typing). */
function normalizeNavigation(raw: WireNavigation | undefined): ManifestNavigation | undefined {
  if (!raw) return undefined;
  const tabs = (raw.tabs ?? []).map((t) => ({
    key: t.key ?? '',
    label: t.label ?? '',
    icon: t.icon ?? '',
    requiresFlag: t.requires_flag ?? undefined,
  }));
  const ca = raw.center_action;
  const globals = raw.globals;
  return {
    tabs,
    centerAction: ca
      ? {
          key: ca.key ?? '',
          label: ca.label ?? '',
          icon: ca.icon ?? '',
          requiresFlag: ca.requires_flag ?? undefined,
          fallback: ca.fallback ?? undefined,
        }
      : undefined,
    globals: globals
      ? {
          showNotifications: globals.show_notifications === true,
          showSearch: globals.show_search === true,
          showSupport: globals.show_support === true,
        }
      : undefined,
    // Passed through as-served; resolveNavStyle (P7.4) applies the editorial fallback + warn
    // for values this binary doesn't know (older app, newer manifest).
    style: raw.style ? (raw.style as NonNullable<ManifestNavigation['style']>) : undefined,
  };
}

function normalizeConcierge(raw: WireConcierge | null | undefined): ManifestConcierge | undefined {
  if (!raw) return undefined;
  return {
    personaName: raw.persona_name ?? 'Concierge',
    tone: raw.tone ?? 'warm',
    accentToken: raw.accent_token ?? 'gold',
  };
}

/** Turn the raw backend manifest into the app's resolved, theme-merged manifest. */
export function normalizeManifest(raw: ManifestOut, etag?: string): ResolvedManifest {
  const theme = deepMerge<ThemeTokens>(DEFAULT_THEME, raw.theme);
  const endpoints = raw.endpoints ?? {};
  // `mode` is an additive manifest field (ManifestTheme extra="allow"); read it defensively.
  const rawMode = (raw.theme as { mode?: unknown } | undefined)?.mode;
  const themeMode =
    rawMode === 'dark' || rawMode === 'light' || rawMode === 'system' ? rawMode : undefined;
  return {
    version: raw.version,
    tenantId: raw.tenant_id,
    tenantSlug: raw.tenant_slug,
    name: raw.name,
    theme,
    themeMode,
    featureFlags: coerceFlags(raw.feature_flags),
    navigation: normalizeNavigation(raw.navigation),
    concierge: normalizeConcierge(raw.concierge),
    splash: raw.splash as Record<string, unknown> | undefined,
    minAppVersion: raw.min_app_version ?? undefined,
    apiBaseUrl: resolveApiBaseUrl(endpoints.api_base_url),
    etag,
    updatedAt: raw.updated_at ?? undefined,
  };
}
