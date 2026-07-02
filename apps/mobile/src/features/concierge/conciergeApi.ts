import { baseApi } from '@repo/api-client';

import type { ConciergeEnvelope, ConciergeOffers, ConciergePlan } from './types';
import type { components } from '@repo/api-client';

export type ConsentOut = components['schemas']['ConciergeConsentOut'];

/**
 * Player concierge endpoints (P6.6). The brief is prefetched during manifest resolve so Home
 * renders it from cache — a spinner on Home is a product failure (integration plan §3).
 */
export const conciergeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBrief: build.query<ConciergeEnvelope, void>({
      query: () => ({ url: '/concierge/brief' }),
      providesTags: ['Concierge'],
    }),
    getConciergeOffers: build.query<ConciergeOffers, void>({
      query: () => ({ url: '/concierge/offers' }),
      providesTags: ['Concierge'],
    }),
    planVisit: build.mutation<ConciergePlan, { date?: string | null }>({
      query: (body) => ({ url: '/concierge/plan', method: 'POST', body }),
    }),
    askConcierge: build.mutation<ConciergeEnvelope, { question: string }>({
      query: (body) => ({ url: '/concierge/ask', method: 'POST', body }),
    }),
    setConciergeConsent: build.mutation<
      ConsentOut,
      { granted: boolean; home_origin?: { lat: number; lng: number; label?: string | null } }
    >({
      query: (body) => ({ url: '/concierge/consent', method: 'POST', body }),
      // New consent changes what the orchestrator can compute — refetch concierge answers.
      invalidatesTags: ['Concierge'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetBriefQuery,
  useGetConciergeOffersQuery,
  usePlanVisitMutation,
  useAskConciergeMutation,
  useSetConciergeConsentMutation,
} = conciergeApi;
