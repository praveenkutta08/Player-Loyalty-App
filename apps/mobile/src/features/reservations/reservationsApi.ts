import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type ReservationOut = components['schemas']['ReservationOut'];
export type ReservationType = components['schemas']['ReservationType'];
export type ValetOut = components['schemas']['ValetOut'];

/**
 * Reservations & valet (player audience), injected on the shared baseApi with generated types
 * (GOLDEN RULE #7). Booking/cancelling/valet all invalidate the `Reservation` tag so lists refresh.
 */
export const reservationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getReservations: build.query<ReservationOut[], void>({
      query: () => ({ url: '/app/reservations' }),
      providesTags: ['Reservation'],
    }),
    getReservation: build.query<ReservationOut, string>({
      query: (id) => ({ url: `/app/reservations/${id}` }),
      providesTags: ['Reservation'],
    }),
    bookReservation: build.mutation<
      ReservationOut,
      { type: ReservationType; start_at?: string | null; end_at?: string | null; notes?: string | null }
    >({
      query: (body) => ({ url: '/app/reservations', method: 'POST', body }),
      invalidatesTags: ['Reservation'],
    }),
    cancelReservation: build.mutation<ReservationOut, string>({
      query: (id) => ({ url: `/app/reservations/${id}/cancel`, method: 'POST' }),
      invalidatesTags: ['Reservation'],
    }),
    requestValet: build.mutation<ValetOut, void>({
      query: () => ({ url: '/app/valet', method: 'POST' }),
    }),
    getValet: build.query<ValetOut, string>({
      query: (id) => ({ url: `/app/valet/${id}` }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetReservationsQuery,
  useGetReservationQuery,
  useBookReservationMutation,
  useCancelReservationMutation,
  useRequestValetMutation,
  useGetValetQuery,
} = reservationsApi;
