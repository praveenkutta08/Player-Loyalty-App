import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type ChatResponse = components['schemas']['ChatResponse'];
export type MessageOut = components['schemas']['MessageOut'];
export type TicketOut = components['schemas']['TicketOut'];

/**
 * Support assistant (player audience): one chat turn at a time, history by session, and
 * escalate-to-human. The assistant reply carries confidence + escalate/refused flags so the UI can
 * surface a "talk to a person" path (GOLDEN RULE guardrails live server-side in the ChatPort).
 */
export const supportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendChat: build.mutation<ChatResponse, { message: string; session_id?: string | null }>({
      query: (body) => ({ url: '/support/chat', method: 'POST', body }),
    }),
    getHistory: build.query<MessageOut[], string>({
      query: (sessionId) => ({ url: '/support/history', params: { session_id: sessionId } }),
      providesTags: ['Support'],
    }),
    escalate: build.mutation<TicketOut, { session_id: string; subject?: string }>({
      query: (body) => ({ url: '/support/escalate', method: 'POST', body }),
      invalidatesTags: ['Support'],
    }),
  }),
  overrideExisting: false,
});

export const { useSendChatMutation, useGetHistoryQuery, useEscalateMutation } = supportApi;
