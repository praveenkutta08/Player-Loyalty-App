import React, { useEffect } from 'react';

import { useAppDispatch } from '../../app/store';

import { setUnauthenticated } from './authSlice';
import { restoreSession } from './session';

/**
 * On launch, tries to revive a session from the Keychain refresh token. Success flips auth status
 * to `authenticated` (session persists the new access token); failure marks `unauthenticated` so
 * the gate shows the auth stack. Until then status stays `restoring` (brand splash).
 */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let active = true;
    restoreSession()
      .then((ok) => {
        if (active && !ok) dispatch(setUnauthenticated());
      })
      .catch(() => {
        if (active) dispatch(setUnauthenticated());
      });
    return () => {
      active = false;
    };
  }, [dispatch]);
  return <>{children}</>;
}
