import React, { useEffect } from 'react';

import { useAppDispatch } from '../../app/store';
import { biometrics } from '../../native/biometrics';

import { setUnauthenticated } from './authSlice';
import { lock, setAvailable, setEnabled } from './biometricSlice';
import { isBiometricEnabled } from './biometricStore';
import { restoreSession } from './session';

/**
 * On launch: check the biometric sensor + persisted preference (locking a restored session behind
 * "Identify to Enter" when enabled), then try to revive a session from the Keychain refresh token.
 * Success flips auth status to `authenticated`; failure marks `unauthenticated` (auth stack). Until
 * then status stays `restoring` (brand splash).
 */
export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const dispatch = useAppDispatch();
  useEffect(() => {
    let active = true;

    void (async () => {
      const [available, enabled] = await Promise.all([
        biometrics.isAvailable(),
        isBiometricEnabled(),
      ]);
      if (!active) return;
      dispatch(setAvailable(available));
      dispatch(setEnabled(enabled));
      // Lock first so a restored session never flashes the app before "Identify to Enter".
      if (enabled) dispatch(lock());
      restoreSession()
        .then((ok) => {
          if (active && !ok) dispatch(setUnauthenticated());
        })
        .catch(() => {
          if (active) dispatch(setUnauthenticated());
        });
    })();

    return () => {
      active = false;
    };
  }, [dispatch]);
  return <>{children}</>;
}
