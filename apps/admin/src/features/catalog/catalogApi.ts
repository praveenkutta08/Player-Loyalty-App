import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Offer = components['schemas']['OfferOut'];
export type OfferPage = components['schemas']['OfferPage'];
export type OfferCreate = components['schemas']['OfferCreate'];
export type OfferUpdate = components['schemas']['OfferUpdate'];

// The admin lists are cursor-paginated (M2). These management tables aren't paged in the UI yet, so
// fetch the first (max-size) page and hand callers the array unchanged; "load more" following
// `next_cursor` is a follow-up that needs no backend change.
const PAGE_SIZE = 100;

// Offers and promotions share the OfferOut shape but live under separate, separately-gated routes
// (/offers → offers:*, /promotions → promotions:*). Publishing bumps the manifest server-side.
export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ---- Offers ----
    listOffers: build.query<Offer[], void>({
      query: () => ({ url: '/offers', params: { limit: PAGE_SIZE } }),
      transformResponse: (page: OfferPage) => page.items,
      providesTags: ['Offer'],
    }),
    createOffer: build.mutation<Offer, OfferCreate>({
      query: (body) => ({ url: '/offers', method: 'POST', body }),
      invalidatesTags: ['Offer'],
    }),
    updateOffer: build.mutation<Offer, { id: string; body: OfferUpdate }>({
      query: ({ id, body }) => ({ url: `/offers/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Offer'],
    }),
    publishOffer: build.mutation<Offer, string>({
      query: (id) => ({ url: `/offers/${id}/publish`, method: 'POST' }),
      invalidatesTags: ['Offer', 'Manifest'],
    }),
    deleteOffer: build.mutation<void, string>({
      query: (id) => ({ url: `/offers/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Offer'],
    }),
    // ---- Promotions ----
    listPromotions: build.query<Offer[], void>({
      query: () => ({ url: '/promotions', params: { limit: PAGE_SIZE } }),
      transformResponse: (page: OfferPage) => page.items,
      providesTags: ['Promotion'],
    }),
    createPromotion: build.mutation<Offer, OfferCreate>({
      query: (body) => ({ url: '/promotions', method: 'POST', body }),
      invalidatesTags: ['Promotion'],
    }),
    updatePromotion: build.mutation<Offer, { id: string; body: OfferUpdate }>({
      query: ({ id, body }) => ({ url: `/promotions/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Promotion'],
    }),
    publishPromotion: build.mutation<Offer, string>({
      query: (id) => ({ url: `/promotions/${id}/publish`, method: 'POST' }),
      invalidatesTags: ['Promotion', 'Manifest'],
    }),
    deletePromotion: build.mutation<void, string>({
      query: (id) => ({ url: `/promotions/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Promotion'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListOffersQuery,
  useCreateOfferMutation,
  useUpdateOfferMutation,
  usePublishOfferMutation,
  useDeleteOfferMutation,
  useListPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  usePublishPromotionMutation,
  useDeletePromotionMutation,
} = catalogApi;
