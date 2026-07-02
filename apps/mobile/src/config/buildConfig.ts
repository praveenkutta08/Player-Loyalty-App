import { API_HOST, TENANT_ID } from '@env';
import { Platform } from 'react-native';

/**
 * Per-tenant build configuration — the ONLY brand-adjacent values compiled into a white-label
 * build. Everything visual (theme, nav, feature flags) still comes from the runtime manifest
 * (GOLDEN RULE #5); this just tells the app which tenant it is and where its API lives so it can
 * fetch that manifest on first launch (the manifest endpoint requires an `X-Tenant` id).
 *
 * In real white-label builds these are injected per iOS scheme / Android product flavor. For dev,
 * `TENANT_ID` / `API_HOST` come from `apps/mobile/.env` (see .env.example + docs/RUNNING.md) so a
 * new developer sets their seeded tenant id there rather than editing this tracked file. When
 * unset, the committed demo fallbacks below apply.
 */

/** Committed demo fallbacks (used when apps/mobile/.env is absent or a key is blank). */
const DEMO_TENANT_ID = '3e321b81-eae9-4ece-81a1-a6d4c9a3bcfd';
export interface BuildConfig {
  /** Display name used for the native app shell (overridden per flavor/scheme). */
  appName: string;
  /** Tenant slug (human-readable). */
  tenantSlug: string;
  /**
   * Tenant UUID sent as `X-Tenant` when fetching the manifest. Filled from the seeded demo tenant
   * in P4.2; empty here because P4.1 does not yet fetch the manifest.
   */
  tenantId: string;
  /** Base API URL used until the manifest supplies the tenant's own `endpoints.apiBaseUrl`. */
  apiBaseUrl: string;
  /** Minimum app version this build supports; below the manifest's floor we show force-update (G8). */
  appVersion: string;
}

/**
 * Android emulators reach the host machine at 10.0.2.2; iOS simulators use localhost. Physical
 * devices need the host LAN IP (set per build). Defaults target the local dev backend on :8000.
 */
const DEV_API_HOST =
  API_HOST ||
  Platform.select({
    android: 'http://10.0.2.2:8000',
    default: 'http://localhost:8000',
  });

export const buildConfig: BuildConfig = {
  appName: 'Casino Companion',
  tenantSlug: 'demo-casino',
  // Seeded demo tenant — from apps/mobile/.env (TENANT_ID) or the committed demo fallback.
  // Injected per flavor/scheme in real white-label builds.
  tenantId: TENANT_ID || DEMO_TENANT_ID,
  apiBaseUrl: `${DEV_API_HOST}/api/v1`,
  appVersion: '0.0.1',
};
