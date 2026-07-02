import { configureApiAuth } from '@repo/api-client';

import { clearAuth } from './authSlice';
import { tokenStore } from './tokenStore';

import { store } from '@/app/store';

/**
 * Wires the shared baseApi auth hooks to the admin's token store: attach the access token, refresh
 * on 401 via the admin refresh endpoint, and drop the session if refresh fails.
 */
export function installAuthBridge(): void {
  configureApiAuth({
    getAccessToken: () => tokenStore.getAccess(),
    // Send the sidebar's selected tenant as X-Tenant on every tenant-scoped call.
    getActingTenant: () => store.getState().session.activeTenantId || null,
    refresh: async () => {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) return false;
      try {
        const res = await fetch('/api/v1/auth/admin/refresh', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) {
          tokenStore.clear();
          return false;
        }
        tokenStore.set(await res.json());
        return true;
      } catch {
        tokenStore.clear();
        return false;
      }
    },
    onUnauthorized: () => {
      tokenStore.clear();
      store.dispatch(clearAuth());
    },
  });
}
