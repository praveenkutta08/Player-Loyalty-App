import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Tracks which offers the player has redeemed this session so lists/detail reflect the redeemed
 * state immediately (OfferOut carries no per-player redemption flag). The server ledger remains the
 * source of truth; this is a UI mirror.
 */
export interface RedeemedState {
  offerIds: string[];
}

const initialState: RedeemedState = { offerIds: [] };

const redeemedSlice = createSlice({
  name: 'redeemed',
  initialState,
  reducers: {
    markRedeemed(state, action: PayloadAction<string>) {
      if (!state.offerIds.includes(action.payload)) state.offerIds.push(action.payload);
    },
  },
});

export const { markRedeemed } = redeemedSlice.actions;
export default redeemedSlice.reducer;
