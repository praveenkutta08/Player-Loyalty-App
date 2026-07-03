import { configureApiAuth } from '@repo/api-client';

import { getApiBaseUrl } from '../../app/apiConfig';
import { store } from '../../app/store';
import { push } from '../../native/push';
import { secureStore } from '../../native/secureStore';

import { authApi } from './authApi';
import { clearSession, setAccessToken } from './authSlice';

import type { components } from '@repo/api-client';

type TokenPair = components['schemas']['TokenPair'];

/** Keychain service name for the long-lived player refresh token. */
const REFRESH_KEY = 'player.refresh';

/**
 * Persist a freshly issued token pair: access token to memory (Redux, read on every request) and
 * the refresh token to the Keychain (secure enclave — GOLDEN RULE #6).
 */
export async function persistTokens(tokens: TokenPair): Promise<void> {
  store.dispatch(setAccessToken(tokens.access_token));
  await secureStore.setToken(REFRESH_KEY, tokens.refresh_token);
}

/**
 * Full logout: revoke the refresh token's family server-side (best-effort, M1), then drop the
 * in-memory access token and wipe the Keychain refresh token.
 */
export async function logout(): Promise<void> {
  const refreshToken = await secureStore.getToken(REFRESH_KEY);
  if (refreshToken) {
    try {
      await fetch(`${getApiBaseUrl()}/auth/player/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // best-effort — always clear local state below even if the server is unreachable
    }
  }
  store.dispatch(clearSession());
  await secureStore.removeToken(REFRESH_KEY);
}

/**
 * Register the device's push token after login so campaigns can target it. Best-effort — a failure
 * never blocks the session. The token is a dev stub until Notifee/Firebase land in P4.9.
 */
export async function registerDevice(): Promise<void> {
  try {
    const pushToken = await push.getDeviceToken();
    await store
      .dispatch(
        authApi.endpoints.registerDevice.initiate({
          platform: push.platform(),
          push_token: pushToken,
        }),
      )
      .unwrap();
  } catch {
    // ignore — device registration is not critical to the session
  }
}

// Single-flight refresh so concurrent 401s don't stampede the refresh endpoint.
let refreshing: Promise<boolean> | null = null;

/**
 * Refresh the access token from the Keychain refresh token. Done with a direct fetch (not RTK) so
 * it bypasses the baseQuery re-auth wrapper and can't recurse when the refresh token is itself
 * rejected. Returns true when a new access token is now in memory.
 */
async function doRefresh(): Promise<boolean> {
  const refreshToken = await secureStore.getToken(REFRESH_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/player/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as TokenPair;
    await persistTokens(data);
    return true;
  } catch {
    return false;
  }
}

/** Try to revive a session on launch from the stored refresh token. */
export function restoreSession(): Promise<boolean> {
  return doRefresh();
}

// Wire the shared API client to this session (side effect at import).
configureApiAuth({
  getAccessToken: () => store.getState().auth.accessToken,
  refresh: () => {
    if (!refreshing) {
      refreshing = doRefresh().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  },
  onUnauthorized: () => {
    void logout();
  },
});
