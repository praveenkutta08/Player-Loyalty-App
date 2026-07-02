import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Biometric-unlock session state. `enabled` mirrors the persisted preference (biometricStore);
 * `available` comes from the native sensor check; `locked` gates the app behind the "Identify to
 * Enter" screen after a session is restored on launch. `enrollDismissed` suppresses the one-time
 * post-login enroll prompt for this session.
 */
export interface BiometricState {
  available: boolean;
  enabled: boolean;
  locked: boolean;
  enrollDismissed: boolean;
}

const initialState: BiometricState = {
  available: false,
  enabled: false,
  locked: false,
  enrollDismissed: false,
};

const biometricSlice = createSlice({
  name: 'biometric',
  initialState,
  reducers: {
    setAvailable(state, action: PayloadAction<boolean>) {
      state.available = action.payload;
    },
    setEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
      if (!action.payload) state.locked = false;
    },
    lock(state) {
      if (state.enabled) state.locked = true;
    },
    unlock(state) {
      state.locked = false;
    },
    dismissEnroll(state) {
      state.enrollDismissed = true;
    },
  },
});

export const { setAvailable, setEnabled, lock, unlock, dismissEnroll } = biometricSlice.actions;
export default biometricSlice.reducer;
