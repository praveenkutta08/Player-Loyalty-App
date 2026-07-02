import { setApiBaseUrl } from '@repo/api-client';

import { buildConfig } from '../config/buildConfig';

/**
 * Owns the active API base URL. The very first manifest fetch uses the build-config default; once
 * the manifest resolves, `updateApiBaseUrl` points both the RTK Query client and any direct fetches
 * (e.g. the token refresh in features/auth/session) at the tenant's base URL. Player auth
 * (`configureApiAuth`) is wired in features/auth/session.
 */
let activeBaseUrl = buildConfig.apiBaseUrl;

export function getApiBaseUrl(): string {
  return activeBaseUrl;
}

export function updateApiBaseUrl(url: string): void {
  activeBaseUrl = url;
  setApiBaseUrl(url);
}

// Initialize before any request is made.
updateApiBaseUrl(buildConfig.apiBaseUrl);
