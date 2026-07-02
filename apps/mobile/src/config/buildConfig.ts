import { API_HOST, TENANT_ID } from '@env';
import { NativeModules, Platform } from 'react-native';

/**
 * Per-tenant build configuration — the ONLY brand-adjacent values compiled into a white-label
 * build. Everything visual (theme, nav, feature flags) still comes from the runtime manifest
 * (GOLDEN RULE #5); this just tells the app which tenant it is and where its API lives so it can
 * fetch that manifest on first launch (the manifest endpoint requires an `X-Tenant` id).
 *
 * Resolution order (H6):
 *  1. The TenantBuildConfig NATIVE module — per Android product flavor / iOS scheme, injected at
 *     native build time (android/app/build.gradle productFlavors, ios/Config/<Tenant>.xcconfig).
 *  2. `apps/mobile/.env` (`TENANT_ID` / `API_HOST`) — the dev loop; see docs/RUNNING.md.
 *  3. Committed demo fallbacks — a fresh checkout still boots against the seeded demo tenant.
 */

/** Committed demo fallbacks (used when apps/mobile/.env is absent or a key is blank). */
const DEMO_TENANT_ID = '3e321b81-eae9-4ece-81a1-a6d4c9a3bcfd';

export interface BuildConfig {
  /** Display name used for the native app shell (overridden per flavor/scheme). */
  appName: string;
  /** Tenant slug (human-readable). */
  tenantSlug: string;
  /** Tenant UUID sent as `X-Tenant` when fetching the manifest. */
  tenantId: string;
  /** Base API URL used until the manifest supplies the tenant's own `endpoints.apiBaseUrl`. */
  apiBaseUrl: string;
  /** Running app version; below the manifest's `min_app_version` we show force-update (G8). */
  appVersion: string;
}

/** Shape of the constants exported by the TenantBuildConfig native module (blank = unset). */
export interface NativeTenantBuildConfig {
  tenantId?: string;
  tenantSlug?: string;
  apiBaseUrl?: string;
  appName?: string;
  appVersion?: string;
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

/** Pure resolution (exported for tests): native flavor values win; blanks fall through. */
export function resolveBuildConfig(
  native: NativeTenantBuildConfig,
  env: { tenantId?: string; devApiHost?: string },
): BuildConfig {
  return {
    appName: native.appName || 'Casino Companion',
    tenantSlug: native.tenantSlug || 'demo-casino',
    tenantId: native.tenantId || env.tenantId || DEMO_TENANT_ID,
    apiBaseUrl: native.apiBaseUrl || `${env.devApiHost ?? 'http://localhost:8000'}/api/v1`,
    appVersion: native.appVersion || '0.0.1',
  };
}

const nativeTenantConfig: NativeTenantBuildConfig =
  (NativeModules as { TenantBuildConfig?: NativeTenantBuildConfig }).TenantBuildConfig ?? {};

export const buildConfig: BuildConfig = resolveBuildConfig(nativeTenantConfig, {
  tenantId: TENANT_ID,
  devApiHost: DEV_API_HOST,
});
