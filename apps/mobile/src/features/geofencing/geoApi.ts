import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type GeoSyncOut = components['schemas']['GeoSyncOut'];
export type ZoneOut = components['schemas']['ZoneOut'];
export type BeaconOut = components['schemas']['BeaconOut'];
export type TriggerEvent = components['schemas']['TriggerEvent'];
export type GeoEventOut = components['schemas']['GeoEventOut'];
export type ConsentOut = components['schemas']['ConsentOut'];

/**
 * Geofencing (player audience): sync the tenant's zones/beacons, record consent, and post
 * enter/dwell/exit events. The server trigger engine matches rules + dispatches pushes (honouring
 * frequency caps + quiet hours); the client only reports movement.
 */
export const geoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGeoSync: build.query<GeoSyncOut, void>({
      query: () => ({ url: '/geo/sync' }),
    }),
    setGeoConsent: build.mutation<ConsentOut, boolean>({
      query: (granted) => ({ url: '/geo/consent', method: 'POST', body: { granted } }),
    }),
    postGeoEvent: build.mutation<
      GeoEventOut,
      { zone_id: string; event: TriggerEvent; dwell_seconds?: number | null }
    >({
      query: (body) => ({ url: '/geo/events', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetGeoSyncQuery, useSetGeoConsentMutation, usePostGeoEventMutation } = geoApi;
