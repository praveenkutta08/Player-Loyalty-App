import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Auth session state (player audience). The access token is held in memory only (read by
 * `configureApiAuth.getAccessToken`); the long-lived refresh token lives in the Keychain
 * (features/auth/session), never in Redux. `status` gates the app between the auth stack and the
 * main tabs. `restoring` is the launch state while we try to revive a session from the Keychain.
 */
export type AuthStatus = 'restoring' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
}

const initialState: AuthState = { status: 'restoring', accessToken: null };

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      state.status = 'authenticated';
    },
    clearSession(state) {
      state.accessToken = null;
      state.status = 'unauthenticated';
    },
    setUnauthenticated(state) {
      state.status = 'unauthenticated';
    },
  },
});

export const { setAccessToken, clearSession, setUnauthenticated } = authSlice.actions;
export default authSlice.reducer;
