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

/** Raw manifest as served by the backend (snake_case, possibly partial `theme`). */
export type ManifestOut = components['schemas']['ManifestOut'];

/** The manifest after normalization: camelCase, theme merged over defaults, platform-resolved URL. */
export interface ResolvedManifest {
  version: number;
  tenantId: string;
  tenantSlug: string;
  name: string;
  theme: ThemeTokens;
  featureFlags: FeatureFlags;
  navigation?: ManifestNavigation;
  /** Concierge persona (P6.5); the `concierge` feature flag gates the UI. */
  concierge?: ManifestConcierge;
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

function coerceFlags(raw: Record<string, unknown> | undefined): FeatureFlags {
  const out: FeatureFlags = {};
  for (const [key, value] of Object.entries(raw ?? {})) out[key] = value === true;
  return out;
}

function normalizeNavigation(
  raw: Record<string, unknown> | undefined,
): ManifestNavigation | undefined {
  if (!raw) return undefined;
  const tabs = Array.isArray(raw.tabs)
    ? (raw.tabs as Array<Record<string, unknown>>).map((t) => ({
        key: String(t.key),
        label: String(t.label),
        icon: String(t.icon),
        requiresFlag: t.requires_flag ? String(t.requires_flag) : undefined,
      }))
    : [];
  const ca = raw.center_action as Record<string, unknown> | undefined;
  const globals = raw.globals as Record<string, unknown> | undefined;
  return {
    tabs,
    centerAction: ca
      ? {
          key: String(ca.key),
          label: String(ca.label),
          icon: String(ca.icon),
          requiresFlag: ca.requires_flag ? String(ca.requires_flag) : undefined,
          fallback: ca.fallback ? String(ca.fallback) : undefined,
        }
      : undefined,
    globals: globals
      ? {
          showNotifications: globals.show_notifications === true,
          showSearch: globals.show_search === true,
          showSupport: globals.show_support === true,
        }
      : undefined,
  };
}

function normalizeConcierge(
  raw: Record<string, unknown> | null | undefined,
): ManifestConcierge | undefined {
  if (!raw) return undefined;
  return {
    personaName: typeof raw.persona_name === 'string' ? raw.persona_name : 'Concierge',
    tone: typeof raw.tone === 'string' ? raw.tone : 'warm',
    accentToken: typeof raw.accent_token === 'string' ? raw.accent_token : 'gold',
  };
}

/** Turn the raw backend manifest into the app's resolved, theme-merged manifest. */
export function normalizeManifest(raw: ManifestOut, etag?: string): ResolvedManifest {
  const theme = deepMerge<ThemeTokens>(DEFAULT_THEME, raw.theme);
  const endpoints = (raw.endpoints ?? {}) as Record<string, string>;
  return {
    version: raw.version,
    tenantId: raw.tenant_id,
    tenantSlug: raw.tenant_slug,
    name: raw.name,
    theme,
    featureFlags: coerceFlags(raw.feature_flags as Record<string, unknown>),
    navigation: normalizeNavigation(raw.navigation as Record<string, unknown>),
    concierge: normalizeConcierge(raw.concierge as Record<string, unknown> | null | undefined),
    apiBaseUrl: resolveApiBaseUrl(endpoints.api_base_url),
    etag,
    updatedAt: raw.updated_at ?? undefined,
  };
}
