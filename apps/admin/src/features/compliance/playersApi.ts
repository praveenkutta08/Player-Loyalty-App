import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type PlayerRg = components['schemas']['PlayerRgOut'];
export type RgFlagsUpdate = components['schemas']['RgFlagsUpdate'];

/**
 * Responsible-gaming controls (audit H2). Writes hit the permission-gated
 * PATCH /players/{id}/rg-flags, which the server audits — the toast copy is finally true.
 */
export const playersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRgFlagged: build.query<PlayerRg[], void>({
      query: () => ({ url: '/players/rg-flagged' }),
      providesTags: ['Player'],
    }),
    lookupPlayer: build.query<PlayerRg, string>({
      query: (email) => ({ url: '/players/lookup', params: { email } }),
      providesTags: ['Player'],
    }),
    setRgFlags: build.mutation<PlayerRg, { playerId: string; body: RgFlagsUpdate }>({
      query: ({ playerId, body }) => ({
        url: `/players/${playerId}/rg-flags`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Player', 'AuditLog'],
    }),
  }),
  overrideExisting: false,
});

export const { useListRgFlaggedQuery, useLazyLookupPlayerQuery, useSetRgFlagsMutation } =
  playersApi;
