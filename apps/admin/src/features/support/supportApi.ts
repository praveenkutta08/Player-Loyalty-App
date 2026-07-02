import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Faq = components['schemas']['FaqOut'];
export type FaqCreate = components['schemas']['FaqCreate'];

// Support-assistant FAQ knowledge base for the acting tenant (gated by content:* on the backend).
export const supportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listFaq: build.query<Faq[], void>({
      query: () => ({ url: '/support/faq' }),
      providesTags: ['Content'],
    }),
    createFaq: build.mutation<Faq, FaqCreate>({
      query: (body) => ({ url: '/support/faq', method: 'POST', body }),
      invalidatesTags: ['Content'],
    }),
  }),
  overrideExisting: false,
});

export const { useListFaqQuery, useCreateFaqMutation } = supportApi;
