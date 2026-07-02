import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Client mirror of the player's favorited games. The catalog `GameOut` carries no per-player
 * favorite flag, so the UI reads this set for the immediate favorited state while the mutation
 * persists the toggle server-side (the server remains the source of truth).
 */
export interface FavoritesState {
  gameIds: string[];
}

const initialState: FavoritesState = { gameIds: [] };

const favoritesSlice = createSlice({
  name: 'gameFavorites',
  initialState,
  reducers: {
    setFavorite(state, action: PayloadAction<{ id: string; favorite: boolean }>) {
      const { id, favorite } = action.payload;
      const has = state.gameIds.includes(id);
      if (favorite && !has) state.gameIds.push(id);
      if (!favorite && has) state.gameIds = state.gameIds.filter((g) => g !== id);
    },
  },
});

export const { setFavorite } = favoritesSlice.actions;
export default favoritesSlice.reducer;

export function isFavorite(state: FavoritesState, id: string): boolean {
  return state.gameIds.includes(id);
}
