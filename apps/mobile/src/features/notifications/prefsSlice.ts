import { createSlice } from '@reduxjs/toolkit';

import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Notification preferences (M5): per-channel opt-in, quiet hours, and the location opt-in that the
 * geofencing feature (P4.10) reads before scheduling location-triggered pushes. Session-local in the
 * MVP; a real build persists these server-side and honours them in the sender.
 */
export type NotificationChannel = 'offers' | 'promotions' | 'account' | 'concierge';

export interface NotificationPrefsState {
  channels: Record<NotificationChannel, boolean>;
  quietHours: { enabled: boolean; startHour: number; endHour: number };
  locationOptIn: boolean;
}

const initialState: NotificationPrefsState = {
  channels: { offers: true, promotions: true, account: true, concierge: true },
  quietHours: { enabled: false, startHour: 22, endHour: 8 },
  locationOptIn: false,
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
  },
});

export const { toggleChannel, setQuietHoursEnabled, setQuietHours, setLocationOptIn } =
  prefsSlice.actions;
export default prefsSlice.reducer;

/** True if `hour` (0-23) falls inside the configured quiet window (handles wrap past midnight). */
export function inQuietHours(state: NotificationPrefsState, hour: number): boolean {
  if (!state.quietHours.enabled) return false;
  const { startHour, endHour } = state.quietHours;
  return startHour <= endHour
    ? hour >= startHour && hour < endHour
    : hour >= startHour || hour < endHour;
}
