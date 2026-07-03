import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

/**
 * Fire-and-forget client metrics (P6.7) into the P2.9 analytics sink. Request/response shapes come
 * from the generated OpenAPI schema (GOLDEN RULE #7 — no hand-written types). The server allowlists
 * event types (`answer_accepted`, `for_you_offer_click`, `list_offer_click`, `ask_to_action`,
 * `brief_render_ms`) and drops the rest without erroring.
 */
export type ClientEventIn = components['schemas']['ClientEventIn'];
export type ClientEventOut = components['schemas']['ClientEventOut'];
export type ClientEventType = ClientEventIn['type'];

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    trackEvent: build.mutation<ClientEventOut, ClientEventIn>({
      query: (body) => ({ url: '/analytics/events', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useTrackEventMutation } = analyticsApi;
