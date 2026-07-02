import { Platform } from 'react-native';

/**
 * Per-tenant build configuration — the ONLY brand-adjacent values compiled into a white-label
 * build. Everything visual (theme, nav, feature flags) still comes from the runtime manifest
 * (GOLDEN RULE #5); this just tells the app which tenant it is and where its API lives so it can
 * fetch that manifest on first launch (the manifest endpoint requires an `X-Tenant` id).
 *
 * In real white-label builds these are injected per iOS scheme / Android product flavor. For dev
 * we ship a single `demo` tenant pointing at the local backend.
 */
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
const DEV_API_HOST = Platform.select({ android: 'http://10.0.2.2:8000', default: 'http://localhost:8000' });

export const buildConfig: BuildConfig = {
  appName: 'Casino Companion',
  tenantSlug: 'demo',
  tenantId: '',
  apiBaseUrl: `${DEV_API_HOST}/api/v1`,
  appVersion: '0.0.1',
};
