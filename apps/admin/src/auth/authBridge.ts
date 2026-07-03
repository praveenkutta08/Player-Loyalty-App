import { configureApiAuth } from '@repo/api-client';

import { clearAuth } from './authSlice';
import { tokenStore } from './tokenStore';

import { store } from '@/app/store';

/**
 * Wires the shared baseApi auth hooks to the admin's token store: attach the in-memory access
 * token, refresh on 401 via the admin refresh endpoint, and drop the session if refresh fails.
 *
 * H5: refresh carries no token in JS — the httpOnly `admin_refresh` cookie the browser holds is
 * sent automatically (`credentials: 'include'`). The response yields only a new access token,
 * which we keep in memory. The single-flight guard in the shared baseApi ensures concurrent 401s
 * trigger exactly one call here.
 */
/**
 * Mint a fresh access token from the httpOnly refresh cookie (H5). Used both on a 401 mid-session
 * and on cold start (AuthGate) to re-establish a session after a reload cleared the in-memory
 * access token. Resolves true when a new access token is now in memory.
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/auth/admin/refresh', {
      method: 'POST',
      credentials: 'include', // send the httpOnly refresh cookie
    });
    if (!res.ok) {
      tokenStore.clear();
      return false;
    }
    const { access_token } = (await res.json()) as { access_token: string };
    tokenStore.setAccess(access_token);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

export function installAuthBridge(): void {
  configureApiAuth({
    getAccessToken: () => tokenStore.getAccess(),
    // Send the sidebar's selected tenant as X-Tenant on every tenant-scoped call.
    getActingTenant: () => store.getState().session.activeTenantId || null,
    refresh: refreshAccessToken,
    onUnauthorized: () => {
      tokenStore.clear();
      store.dispatch(clearAuth());
    },
  });
}
