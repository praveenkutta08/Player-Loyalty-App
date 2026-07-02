import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';

import {
  hydrateNotificationPrefs,
  persistNotificationPrefs,
} from '../src/features/notifications/prefsPersistence';
import prefsReducer, {
  hydratePrefs,
  setConsentSyncPending,
  setLocationOptIn,
  setPushPromptResult,
} from '../src/features/notifications/prefsSlice';

function makeStore() {
  return configureStore({ reducer: { notificationPrefs: prefsReducer } });
}

describe('prefsSlice consent state (H7)', () => {
  it('starts unhydrated with push prompt unasked and location off', () => {
    const store = makeStore();
    const s = store.getState().notificationPrefs;
    expect(s.hydrated).toBe(false);
    expect(s.pushPrompt).toBe('unasked');
    expect(s.locationOptIn).toBe(false);
    expect(s.consentSyncPending).toBe(false);
  });

  it('hydratePrefs merges partial storage and flips hydrated even when empty', () => {
    const store = makeStore();
    store.dispatch(hydratePrefs({}));
    expect(store.getState().notificationPrefs.hydrated).toBe(true);

    store.dispatch(
      hydratePrefs({ pushPrompt: 'enabled', locationOptIn: true, consentSyncPending: true }),
    );
    const s = store.getState().notificationPrefs;
    expect(s.pushPrompt).toBe('enabled');
    expect(s.locationOptIn).toBe(true);
    expect(s.consentSyncPending).toBe(true);
    // untouched defaults survive the merge
    expect(s.channels.offers).toBe(true);
    expect(s.quietHours.startHour).toBe(22);
  });

  it('tracks the push prompt outcome transitions', () => {
    const store = makeStore();
    store.dispatch(setPushPromptResult('declined'));
    expect(store.getState().notificationPrefs.pushPrompt).toBe('declined');
    store.dispatch(setPushPromptResult('enabled'));
    expect(store.getState().notificationPrefs.pushPrompt).toBe('enabled');
  });
});

describe('prefs persistence roundtrip (H7)', () => {
  beforeEach(() => AsyncStorage.clear());

  it('hydrates from storage on launch and persists later changes', async () => {
    await AsyncStorage.setItem(
      'notification-prefs:v1',
      JSON.stringify({ pushPrompt: 'declined', locationOptIn: true }),
    );

    const store = makeStore();
    await hydrateNotificationPrefs(store);
    let s = store.getState().notificationPrefs;
    expect(s.hydrated).toBe(true);
    expect(s.pushPrompt).toBe('declined');
    expect(s.locationOptIn).toBe(true);

    const unsubscribe = persistNotificationPrefs(store);
    store.dispatch(setLocationOptIn(false));
    store.dispatch(setConsentSyncPending(true));
    await Promise.resolve(); // let the fire-and-forget setItem settle

    const raw = await AsyncStorage.getItem('notification-prefs:v1');
    const stored = JSON.parse(raw ?? '{}');
    expect(stored.locationOptIn).toBe(false);
    expect(stored.consentSyncPending).toBe(true);
    expect(stored.hydrated).toBeUndefined(); // runtime-only flag never persists
    unsubscribe();

    // A fresh launch replays the queued opt-out state.
    const nextLaunch = makeStore();
    await hydrateNotificationPrefs(nextLaunch);
    s = nextLaunch.getState().notificationPrefs;
    expect(s.locationOptIn).toBe(false);
    expect(s.consentSyncPending).toBe(true);
  });

  it('survives corrupted storage by falling back to defaults (still hydrated)', async () => {
    await AsyncStorage.setItem('notification-prefs:v1', '{not-json');
    const store = makeStore();
    await hydrateNotificationPrefs(store);
    const s = store.getState().notificationPrefs;
    expect(s.hydrated).toBe(true);
    expect(s.pushPrompt).toBe('unasked');
  });
});
