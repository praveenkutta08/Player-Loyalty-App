import { baseApi } from '@repo/api-client';
import uuid from 'react-native-uuid';

import type { components } from '@repo/api-client';

export type OfferOut = components['schemas']['OfferOut'];
export type RedemptionOut = components['schemas']['app__modules__offers__schemas__RedemptionOut'];
export type ContentItemOut = components['schemas']['ContentItemOut'];

/**
 * App-facing offers, promotions, content and redemption endpoints (player audience), injected on
 * the shared baseApi with generated types (GOLDEN RULE #7). Redeeming an offer requires an
 * Idempotency-Key (GOLDEN RULE #4) so a retry never double-redeems.
 */
export const offersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOffers: build.query<OfferOut[], void>({
      query: () => ({ url: '/app/offers' }),
      providesTags: ['Offer'],
    }),
    getPromotions: build.query<OfferOut[], void>({
      query: () => ({ url: '/app/promotions' }),
      providesTags: ['Promotion'],
    }),
    getContent: build.query<ContentItemOut[], void>({
      query: () => ({ url: '/app/content' }),
      providesTags: ['Content'],
    }),
    redeemOffer: build.mutation<RedemptionOut, { offerId: string; idempotencyKey?: string }>({
      query: ({ offerId, idempotencyKey }) => ({
        url: `/app/offers/${offerId}/redeem`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey ?? String(uuid.v4()) },
      }),
      invalidatesTags: ['Offer'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOffersQuery,
  useGetPromotionsQuery,
  useGetContentQuery,
  useRedeemOfferMutation,
} = offersApi;
