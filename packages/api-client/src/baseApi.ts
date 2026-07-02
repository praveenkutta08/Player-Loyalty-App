import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';

/**
 * Base RTK Query API. Domain endpoints are injected later via `baseApi.injectEndpoints(...)`,
 * typed from `./generated/schema` (GOLDEN RULE #7 — OpenAPI is the contract). Both the admin
 * console and the mobile app consume this single base API so caching and invalidation are shared.
 *
 * The `baseUrl` defaults to a relative `/api/v1`; the mobile app overrides it at runtime from the
 * tenant manifest's `endpoints.apiBaseUrl`.
 *
 * Auth is pluggable via `configureApiAuth`: the host app (admin or mobile) supplies how to read
 * the current access token, how to refresh it on a 401, and what to do when refresh fails. This
 * keeps token handling out of the shared package while still attaching credentials to every call.
 */
export const API_REDUCER_PATH = 'api';

interface ApiAuth {
  /** Current bearer access token, or null when unauthenticated. */
  getAccessToken: () => string | null;
  /**
   * The admin's acting tenant id (UUID), sent as `X-Tenant` on tenant-scoped calls. The server
   * requires it for every tenant-owned resource and validates it against the caller's allow-list.
   * Ignored by player-audience callers (mobile derives its tenant from the token).
   */
  getActingTenant?: () => string | null;
  /** Attempt to refresh the token; resolve true if a new token is now available. */
  refresh?: () => Promise<boolean>;
  /** Called when a request is unauthorized and refresh did not recover the session. */
  onUnauthorized?: () => void;
}

let apiAuth: ApiAuth = { getAccessToken: () => null };

/** Register how the host app supplies/refreshes the access token. */
export function configureApiAuth(auth: ApiAuth): void {
  apiAuth = auth;
}

let apiBaseUrl = '/api/v1';

/** Override the API base URL (the mobile app sets this from the tenant manifest). */
export function setApiBaseUrl(url: string): void {
  apiBaseUrl = url;
}

const rawBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = (
  args,
  api,
  extraOptions,
) =>
  fetchBaseQuery({
    baseUrl: apiBaseUrl,
    // Headers typed structurally (mutated in place, returns void) so the shared package needn't
    // pull in the DOM lib for the global `Headers` type.
    prepareHeaders: (headers: { set: (name: string, value: string) => void }): void => {
      const token = apiAuth.getAccessToken();
      if (token) headers.set('authorization', `Bearer ${token}`);
      const tenant = apiAuth.getActingTenant?.();
      if (tenant) headers.set('X-Tenant', tenant);
    },
  })(args, api, extraOptions);

/** Wraps the base query with a single refresh-and-retry on 401. */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && apiAuth.refresh) {
    const refreshed = await apiAuth.refresh();
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      apiAuth.onUnauthorized?.();
    }
  }
  return result;
};

/** Cache tag types, one per domain resource, used for invalidation once endpoints are injected. */
export const API_TAG_TYPES = [
  'Tenant',
  'AdminUser',
  'Content',
  'Offer',
  'Promotion',
  'PushCampaign',
  'GeofenceZone',
  'LocationTrigger',
  'Reservation',
  'Player',
  'Wallet',
  'DigitalKey',
  'Game',
  'Leaderboard',
  'Reward',
  'Redemption',
  'Support',
  'Device',
  'Manifest',
  'AuditLog',
] as const;

export const baseApi = createApi({
  reducerPath: API_REDUCER_PATH,
  baseQuery: baseQueryWithReauth,
  tagTypes: API_TAG_TYPES,
  // Filled in per-domain via injectEndpoints once the backend + generated schema exist.
  endpoints: () => ({}),
});
