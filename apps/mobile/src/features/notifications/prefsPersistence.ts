import AsyncStorage from '@react-native-async-storage/async-storage';

import { hydratePrefs } from './prefsSlice';

import type { NotificationPrefsState } from './prefsSlice';
import type { UnknownAction } from '@reduxjs/toolkit';

/**
 * Device-storage persistence for notification prefs (H7): channel toggles, quiet hours, the
 * push pre-permission outcome, and the location opt-in mirror survive cold starts instead of
 * silently resetting. Always dispatches `hydratePrefs` (even when nothing is stored) so the
 * `hydrated` flag flips and the push prompt can safely render.
 */
const STORAGE_KEY = 'notification-prefs:v1';

/** The slice of the Redux store this module needs (kept minimal for testability). */
export interface PrefsStoreLike {
  dispatch: (action: UnknownAction) => unknown;
  getState: () => { notificationPrefs: NotificationPrefsState };
  subscribe: (listener: () => void) => () => void;
}

export async function hydrateNotificationPrefs(store: PrefsStoreLike): Promise<void> {
  let stored: Partial<NotificationPrefsState> = {};
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as Partial<NotificationPrefsState>;
  } catch {
    // corrupted/unreadable storage — fall back to defaults
  }
  store.dispatch(hydratePrefs(stored));
}

/** Subscribe to the store and persist pref changes; returns the unsubscribe function. */
export function persistNotificationPrefs(store: PrefsStoreLike): () => void {
  let last: NotificationPrefsState | undefined;
  return store.subscribe(() => {
    const prefs = store.getState().notificationPrefs;
    if (!prefs.hydrated || prefs === last) return;
    last = prefs;
    const persistable: Partial<NotificationPrefsState> = { ...prefs };
    delete persistable.hydrated; // runtime-only flag never persists
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => undefined);
  });
}
