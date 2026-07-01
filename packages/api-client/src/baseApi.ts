import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

/**
 * Base RTK Query API. Domain endpoints are injected later via `baseApi.injectEndpoints(...)`,
 * typed from `./generated/schema` (GOLDEN RULE #7 — OpenAPI is the contract). Both the admin
 * console and the mobile app consume this single base API so caching and invalidation are shared.
 *
 * The `baseUrl` defaults to a relative `/api/v1`; the mobile app overrides it at runtime from the
 * tenant manifest's `endpoints.apiBaseUrl`.
 */
export const API_REDUCER_PATH = 'api';

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
  'Manifest',
  'AuditLog',
] as const;

export const baseApi = createApi({
  reducerPath: API_REDUCER_PATH,
  baseQuery: fetchBaseQuery({ baseUrl: '/api/v1' }),
  tagTypes: API_TAG_TYPES,
  // Filled in per-domain via injectEndpoints once the backend + generated schema exist.
  endpoints: () => ({}),
});
