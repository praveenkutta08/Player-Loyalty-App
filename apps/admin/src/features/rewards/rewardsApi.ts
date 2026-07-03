import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type RewardItem = components['schemas']['RewardItemOut'];
export type RewardItemPage = components['schemas']['RewardItemPage'];
export type RewardItemCreate = components['schemas']['RewardItemCreate'];
export type RewardItemUpdate = components['schemas']['RewardItemUpdate'];

// Cursor-paginated admin catalog (M2); fetch the first (max-size) page, expose the array unchanged.
const PAGE_SIZE = 100;

// Rewards marketplace catalog for the acting tenant (gated by content:* on the backend).
export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listRewards: build.query<RewardItem[], void>({
      query: () => ({ url: '/rewards/admin', params: { limit: PAGE_SIZE } }),
      transformResponse: (page: RewardItemPage) => page.items,
      providesTags: ['Content'],
    }),
    createReward: build.mutation<RewardItem, RewardItemCreate>({
      query: (body) => ({ url: '/rewards/admin', method: 'POST', body }),
      invalidatesTags: ['Content'],
    }),
    updateReward: build.mutation<RewardItem, { id: string; body: RewardItemUpdate }>({
      query: ({ id, body }) => ({ url: `/rewards/admin/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Content'],
    }),
    deleteReward: build.mutation<void, string>({
      query: (id) => ({ url: `/rewards/admin/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Content'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListRewardsQuery,
  useCreateRewardMutation,
  useUpdateRewardMutation,
  useDeleteRewardMutation,
} = rewardsApi;
