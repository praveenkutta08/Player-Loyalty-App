import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type GameOut = components['schemas']['GameOut'];
export type GameCategory = components['schemas']['GameCategory'];
export type LeaderboardOut = components['schemas']['LeaderboardOut'];

/** Catalog filter: All + the server categories. */
export type CatalogFilter = 'all' | GameCategory;

/**
 * Games catalog, favorites, and leaderboard (player audience). The catalog list carries no per-
 * player favorite flag, so favorites are mirrored client-side (favoritesSlice) while the toggle
 * persists server-side. Favoriting invalidates nothing on the list; the leaderboard has its own tag.
 */
export const gamesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getGames: build.query<GameOut[], { category?: GameCategory; q?: string } | void>({
      query: (args) => ({
        url: '/games',
        params: {
          ...(args && args.category ? { category: args.category } : {}),
          ...(args && args.q ? { q: args.q } : {}),
        },
      }),
      providesTags: ['Game'],
    }),
    getJackpotGames: build.query<GameOut[], void>({
      query: () => ({ url: '/games/jackpot' }),
      providesTags: ['Game'],
    }),
    getLeaderboard: build.query<LeaderboardOut, void>({
      query: () => ({ url: '/leaderboard' }),
      providesTags: ['Leaderboard'],
    }),
    favoriteGame: build.mutation<void, string>({
      query: (gameId) => ({ url: `/games/${gameId}/favorite`, method: 'POST' }),
    }),
    unfavoriteGame: build.mutation<void, string>({
      query: (gameId) => ({ url: `/games/${gameId}/favorite`, method: 'DELETE' }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGamesQuery,
  useGetJackpotGamesQuery,
  useGetLeaderboardQuery,
  useFavoriteGameMutation,
  useUnfavoriteGameMutation,
} = gamesApi;
