import { baseApi } from '@repo/api-client';

/**
 * Fire-and-forget client metrics (P6.7) into the P2.9 analytics sink. The server allowlists
 * event types (`answer_accepted`, `for_you_offer_click`, `list_offer_click`, `ask_to_action`,
 * `brief_render_ms`) and drops the rest without erroring.
 */
export type ClientEventType =
  | 'answer_accepted'
  | 'for_you_offer_click'
  | 'list_offer_click'
  | 'ask_to_action'
  | 'brief_render_ms';

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    trackEvent: build.mutation<
      { accepted: boolean },
      { type: ClientEventType; entity_id?: string; meta?: Record<string, unknown> }
    >({
      query: (body) => ({ url: '/analytics/events', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useTrackEventMutation } = analyticsApi;
