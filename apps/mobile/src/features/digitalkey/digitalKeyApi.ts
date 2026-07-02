import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type DigitalKeyOut = components['schemas']['DigitalKeyOut'];
export type UnlockResponse = components['schemas']['UnlockResponse'];

/**
 * Digital key (player audience), injected on the shared baseApi. Keys are only issued for a valid,
 * confirmed hotel reservation (server-enforced). Issue/unlock/revoke invalidate the `DigitalKey`
 * tag so the key list reflects the new state.
 */
export const digitalKeyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getKeys: build.query<DigitalKeyOut[], void>({
      query: () => ({ url: '/keys' }),
      providesTags: ['DigitalKey'],
    }),
    issueKey: build.mutation<DigitalKeyOut, { reservation_id: string; room: string }>({
      query: (body) => ({ url: '/keys', method: 'POST', body }),
      invalidatesTags: ['DigitalKey'],
    }),
    unlockKey: build.mutation<UnlockResponse, { keyId: string; door_id: string }>({
      query: ({ keyId, door_id }) => ({
        url: `/keys/${keyId}/unlock`,
        method: 'POST',
        body: { door_id },
      }),
    }),
    revokeKey: build.mutation<DigitalKeyOut, string>({
      query: (keyId) => ({ url: `/keys/${keyId}/revoke`, method: 'POST' }),
      invalidatesTags: ['DigitalKey'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetKeysQuery, useIssueKeyMutation, useUnlockKeyMutation, useRevokeKeyMutation } =
  digitalKeyApi;
