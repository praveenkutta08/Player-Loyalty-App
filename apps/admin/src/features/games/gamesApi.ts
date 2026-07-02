import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type Game = components['schemas']['GameOut'];
export type GameCreate = components['schemas']['GameCreate'];
export type GameUpdate = components['schemas']['GameUpdate'];

// Games catalog curation for the acting tenant (gated by content:* on the backend).
export const gamesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listGames: build.query<Game[], void>({
      query: () => ({ url: '/games/admin' }),
      providesTags: ['Content'],
    }),
    createGame: build.mutation<Game, GameCreate>({
      query: (body) => ({ url: '/games/admin', method: 'POST', body }),
      invalidatesTags: ['Content'],
    }),
    updateGame: build.mutation<Game, { id: string; body: GameUpdate }>({
      query: ({ id, body }) => ({ url: `/games/admin/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Content'],
    }),
    deleteGame: build.mutation<void, string>({
      query: (id) => ({ url: `/games/admin/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Content'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListGamesQuery,
  useCreateGameMutation,
  useUpdateGameMutation,
  useDeleteGameMutation,
} = gamesApi;
