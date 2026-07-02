import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type MeOut = components['schemas']['MeOut'];
export type ActivityItem = components['schemas']['ActivityItem'];
export type PointsOut = components['schemas']['PointsOut'];
export type KycOut = components['schemas']['KycOut'];

/**
 * Account / loyalty endpoints (player audience) injected on baseApi with generated types. `/me` is
 * the full profile (Home + Account); `/account/*` back the loyalty views; KYC start advances the
 * mock KycPort state machine. All tagged `Player` so a KYC change refreshes the profile.
 */
export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccountMe: build.query<MeOut, void>({
      query: () => ({ url: '/me' }),
      providesTags: ['Player'],
    }),
    getPoints: build.query<PointsOut, void>({
      query: () => ({ url: '/account/points' }),
      providesTags: ['Player'],
    }),
    getActivity: build.query<ActivityItem[], void>({
      query: () => ({ url: '/account/activity' }),
      providesTags: ['Player'],
    }),
    startKyc: build.mutation<KycOut, void>({
      query: () => ({ url: '/account/kyc/start', method: 'POST' }),
      invalidatesTags: ['Player'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAccountMeQuery,
  useGetPointsQuery,
  useGetActivityQuery,
  useStartKycMutation,
} = accountApi;
