import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type ConciergeEnvelope = components['schemas']['ConciergeEnvelope'];
export type PreviewIn = components['schemas']['PreviewIn'];
export type AdminAnswer = components['schemas']['AdminAnswerOut'];

export const conciergeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // What-if brief for a seed player with candidate weights — never cached or audited.
    previewBrief: build.mutation<ConciergeEnvelope, PreviewIn>({
      query: (body) => ({ url: '/concierge/preview', method: 'POST', body }),
    }),
    listConciergeAnswers: build.query<AdminAnswer[], void>({
      query: () => ({ url: '/concierge/answers' }),
      providesTags: ['Concierge'],
    }),
  }),
  overrideExisting: false,
});

export const { usePreviewBriefMutation, useListConciergeAnswersQuery } = conciergeApi;
