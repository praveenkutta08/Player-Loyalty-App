import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Reservation = components['schemas']['ReservationOut'];
export type ReservationStatusUpdate = components['schemas']['ReservationStatusUpdate'];
export type Valet = components['schemas']['ValetOut'];
export type ValetStatusUpdate = components['schemas']['ValetStatusUpdate'];

// Cross-venue reservations + valet queue for the acting tenant (real admin endpoints).
export const reservationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listReservations: build.query<Reservation[], void>({
      query: () => ({ url: '/reservations' }),
      providesTags: ['Reservation'],
    }),
    updateReservation: build.mutation<Reservation, { id: string; body: ReservationStatusUpdate }>({
      query: ({ id, body }) => ({ url: `/reservations/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Reservation'],
    }),
    listValet: build.query<Valet[], void>({
      query: () => ({ url: '/valet' }),
      providesTags: ['Reservation'],
    }),
    updateValet: build.mutation<Valet, { id: string; body: ValetStatusUpdate }>({
      query: ({ id, body }) => ({ url: `/valet/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Reservation'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListReservationsQuery,
  useUpdateReservationMutation,
  useListValetQuery,
  useUpdateValetMutation,
} = reservationsApi;
