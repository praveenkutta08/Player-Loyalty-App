import { baseApi } from '@repo/api-client';
import uuid from 'react-native-uuid';

import type { components } from '@repo/api-client';

export type RewardItemOut = components['schemas']['RewardItemOut'];
export type RedemptionOut = components['schemas']['app__modules__rewards__schemas__RedemptionOut'];
export type RedemptionPage = components['schemas']['RedemptionPage'];

// Redemption history is cursor-paginated (M2); the panel shows the first (max-size) page. Following
// `next_cursor` for older history is a follow-up needing no backend change.
const PAGE_SIZE = 100;

/**
 * Rewards marketplace (player audience). Redeeming requires an Idempotency-Key (GOLDEN RULE #4) so a
 * retry never double-spends points, and invalidates the reward list (stock) + redemption history +
 * the loyalty-backed profile (points balance).
 */
export const rewardsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getRewards: build.query<RewardItemOut[], void>({
      query: () => ({ url: '/rewards' }),
      providesTags: ['Reward'],
    }),
    getMyRedemptions: build.query<RedemptionOut[], void>({
      query: () => ({ url: '/me/redemptions', params: { limit: PAGE_SIZE } }),
      transformResponse: (page: RedemptionPage) => page.items,
      providesTags: ['Redemption'],
    }),
    redeemReward: build.mutation<RedemptionOut, { itemId: string; idempotencyKey?: string }>({
      query: ({ itemId, idempotencyKey }) => ({
        url: `/rewards/${itemId}/redeem`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey ?? String(uuid.v4()) },
      }),
      invalidatesTags: ['Reward', 'Redemption', 'Player'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetRewardsQuery, useGetMyRedemptionsQuery, useRedeemRewardMutation } = rewardsApi;
