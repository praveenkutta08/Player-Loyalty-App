import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Zone = components['schemas']['ZoneOut'];
export type ZonePage = components['schemas']['ZonePage'];
export type ZoneCreate = components['schemas']['ZoneCreate'];
export type ZoneUpdate = components['schemas']['ZoneUpdate'];
export type Beacon = components['schemas']['BeaconOut'];
export type BeaconCreate = components['schemas']['BeaconCreate'];
export type Trigger = components['schemas']['TriggerOut'];
export type TriggerCreate = components['schemas']['TriggerCreate'];
export type TriggerUpdate = components['schemas']['TriggerUpdate'];

// Cursor-paginated admin zone list (M2); fetch the first (max-size) page, expose the array unchanged.
const PAGE_SIZE = 100;

// Geofence zones, beacons and location triggers for the acting tenant.
export const geoApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listZones: build.query<Zone[], void>({
      query: () => ({ url: '/geo/zones', params: { limit: PAGE_SIZE } }),
      transformResponse: (page: ZonePage) => page.items,
      providesTags: ['GeofenceZone'],
    }),
    createZone: build.mutation<Zone, ZoneCreate>({
      query: (body) => ({ url: '/geo/zones', method: 'POST', body }),
      invalidatesTags: ['GeofenceZone'],
    }),
    updateZone: build.mutation<Zone, { id: string; body: ZoneUpdate }>({
      query: ({ id, body }) => ({ url: `/geo/zones/${id}`, method: 'PUT', body }),
      invalidatesTags: ['GeofenceZone'],
    }),
    deleteZone: build.mutation<void, string>({
      query: (id) => ({ url: `/geo/zones/${id}`, method: 'DELETE' }),
      invalidatesTags: ['GeofenceZone'],
    }),
    createBeacon: build.mutation<Beacon, BeaconCreate>({
      query: (body) => ({ url: '/geo/beacons', method: 'POST', body }),
      invalidatesTags: ['GeofenceZone'],
    }),
    listTriggers: build.query<Trigger[], void>({
      query: () => ({ url: '/geo/triggers' }),
      providesTags: ['LocationTrigger'],
    }),
    createTrigger: build.mutation<Trigger, TriggerCreate>({
      query: (body) => ({ url: '/geo/triggers', method: 'POST', body }),
      invalidatesTags: ['LocationTrigger'],
    }),
    updateTrigger: build.mutation<Trigger, { id: string; body: TriggerUpdate }>({
      query: ({ id, body }) => ({ url: `/geo/triggers/${id}`, method: 'PUT', body }),
      invalidatesTags: ['LocationTrigger'],
    }),
    deleteTrigger: build.mutation<void, string>({
      query: (id) => ({ url: `/geo/triggers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['LocationTrigger'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListZonesQuery,
  useCreateZoneMutation,
  useUpdateZoneMutation,
  useDeleteZoneMutation,
  useCreateBeaconMutation,
  useListTriggersQuery,
  useCreateTriggerMutation,
  useUpdateTriggerMutation,
  useDeleteTriggerMutation,
} = geoApi;
