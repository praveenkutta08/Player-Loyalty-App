import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';

import { authApi } from './authApi';
import { clearAuth, setMe, setStatus } from './authSlice';
import { LoginScreen } from './LoginScreen';
import { tokenStore } from './tokenStore';

import type { ReactNode } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store';

/**
 * Bootstraps the session: if an admin token is stored, hydrate `me` (roles/permissions/scope);
 * otherwise show the login screen. Children (the routed console) render only when authenticated.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!tokenStore.getAccess()) {
        dispatch(setStatus('anonymous'));
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
