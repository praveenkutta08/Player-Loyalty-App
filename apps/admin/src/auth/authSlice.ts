import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { AdminMe } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  me: AdminMe | null;
}

const initialState: AuthState = {
  status: 'loading',
  me: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setMe(state, action: PayloadAction<AdminMe>) {
      state.me = action.payload;
      state.status = 'authenticated';
    },
    setStatus(state, action: PayloadAction<AuthStatus>) {
      state.status = action.payload;
    },
    clearAuth(state) {
      state.me = null;
      state.status = 'anonymous';
    },
  },
});

export const { setMe, setStatus, clearAuth } = authSlice.actions;
export default authSlice.reducer;
