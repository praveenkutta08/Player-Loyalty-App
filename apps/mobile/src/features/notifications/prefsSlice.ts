import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Notification preferences (M5): per-channel opt-in, quiet hours, the push pre-permission
 * outcome (H7 — the device token is only registered after the player says yes), and the
 * location opt-in that the geofencing feature (P4.10) reads before scheduling
 * location-triggered pushes. Persisted to device storage via prefsPersistence; the location
 * consent is additionally hydrated from the server (/players/me) on launch so a reinstall or
 * new device reflects the recorded consent.
 */
export type NotificationChannel = 'offers' | 'promotions' | 'account' | 'concierge';

/** Outcome of the push pre-permission flow: never asked, granted+registered, or declined. */
export type PushPromptState = 'unasked' | 'enabled' | 'declined';

export interface NotificationPrefsState {
  channels: Record<NotificationChannel, boolean>;
  quietHours: { enabled: boolean; startHour: number; endHour: number };
  locationOptIn: boolean;
  pushPrompt: PushPromptState;
  /** True while an opt-out consent write is queued for retry (server was unreachable). */
  consentSyncPending: boolean;
  /** True once device-storage hydration ran — gates the push prompt so it never flashes. */
  hydrated: boolean;
}

const initialState: NotificationPrefsState = {
  channels: { offers: true, promotions: true, account: true, concierge: true },
  quietHours: { enabled: false, startHour: 22, endHour: 8 },
  locationOptIn: false,
  pushPrompt: 'unasked',
  consentSyncPending: false,
  hydrated: false,
};

const prefsSlice = createSlice({
  name: 'notificationPrefs',
  initialState,
  reducers: {
    toggleChannel(state, action: PayloadAction<NotificationChannel>) {
      state.channels[action.payload] = !state.channels[action.payload];
    },
    setQuietHoursEnabled(state, action: PayloadAction<boolean>) {
      state.quietHours.enabled = action.payload;
    },
    setQuietHours(state, action: PayloadAction<{ startHour: number; endHour: number }>) {
      state.quietHours.startHour = action.payload.startHour;
      state.quietHours.endHour = action.payload.endHour;
    },
    setLocationOptIn(state, action: PayloadAction<boolean>) {
      state.locationOptIn = action.payload;
    },
    setPushPromptResult(state, action: PayloadAction<PushPromptState>) {
      state.pushPrompt = action.payload;
    },
    setConsentSyncPending(state, action: PayloadAction<boolean>) {
      state.consentSyncPending = action.payload;
    },
    /** Merge persisted prefs from device storage (partial, forward-compatible). */
    hydratePrefs(state, action: PayloadAction<Partial<NotificationPrefsState>>) {
      const stored = action.payload;
      if (stored.channels) state.channels = { ...state.channels, ...stored.channels };
      if (stored.quietHours) state.quietHours = { ...state.quietHours, ...stored.quietHours };
      if (typeof stored.locationOptIn === 'boolean') state.locationOptIn = stored.locationOptIn;
      if (stored.pushPrompt) state.pushPrompt = stored.pushPrompt;
      if (typeof stored.consentSyncPending === 'boolean') {
        state.consentSyncPending = stored.consentSyncPending;
      }
      state.hydrated = true;
    },
  },
});

export const {
  toggleChannel,
  setQuietHoursEnabled,
  setQuietHours,
  setLocationOptIn,
  setPushPromptResult,
  setConsentSyncPending,
  hydratePrefs,
} = prefsSlice.actions;
export default prefsSlice.reducer;

/** True if `hour` (0-23) falls inside the configured quiet window (handles wrap past midnight). */
export function inQuietHours(state: NotificationPrefsState, hour: number): boolean {
  if (!state.quietHours.enabled) return false;
  const { startHour, endHour } = state.quietHours;
  return startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
}
