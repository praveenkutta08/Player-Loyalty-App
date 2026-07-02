import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type MeOut = components['schemas']['MeOut'];

/**
 * Account profile endpoint (player audience). `/me` returns the full profile used for the Home
 * greeting + tier/points snapshot (P4.4) and the Account screens (P4.5). Injected on baseApi with
 * generated types.
 */
export const accountApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAccountMe: build.query<MeOut, void>({
      query: () => ({ url: '/me' }),
      providesTags: ['Player'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetAccountMeQuery } = accountApi;
