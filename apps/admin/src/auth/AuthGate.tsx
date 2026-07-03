import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { authApi } from './authApi';
import { refreshAccessToken } from './authBridge';
import { clearAuth, setMe, setStatus } from './authSlice';
import { LoginScreen } from './LoginScreen';
import { tokenStore } from './tokenStore';

import type { ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store';

/**
 * Bootstraps the session (H5): the access token is memory-only, so a reload starts with none.
 * We silently mint one from the httpOnly refresh cookie; if that succeeds, hydrate `me`
 * (roles/permissions/scope). No cookie / expired session → the login screen. Children (the routed
 * console) render only when authenticated.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Re-establish the access token from the refresh cookie (no-op body; browser sends cookie).
      if (!tokenStore.getAccess() && !(await refreshAccessToken())) {
        if (active) dispatch(setStatus('anonymous'));
        return;
      }
      try {
        const me = await dispatch(authApi.endpoints.me.initiate(undefined)).unwrap();
        if (active) dispatch(setMe(me));
      } catch {
        if (active) {
          tokenStore.clear();
          dispatch(clearAuth());
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [dispatch]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content text-muted">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }
  if (status === 'anonymous') return <LoginScreen />;
  return <>{children}</>;
}
