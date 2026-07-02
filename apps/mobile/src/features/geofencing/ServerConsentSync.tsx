import { useEffect, useRef } from 'react';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { useGetMeQuery } from '../auth/authApi';
import { setConsentSyncPending, setLocationOptIn } from '../notifications/prefsSlice';

import { useSetGeoConsentMutation } from './geoApi';

/**
 * H7 — consent hydrate-on-launch. Once authenticated, the server's recorded location consent
 * (/players/me) is the source of truth: the local mirror is corrected to match, so a cold
 * start / reinstall never resurrects a stale opt-in. The one exception is a queued opt-out
 * (`consentSyncPending`) — that write is replayed first, because the player's last explicit
 * choice outranks the stale server value.
 */
export function ServerConsentSync(): null {
  const dispatch = useAppDispatch();
  const hydrated = useAppSelector((s) => s.notificationPrefs.hydrated);
  const pending = useAppSelector((s) => s.notificationPrefs.consentSyncPending);
  const localOptIn = useAppSelector((s) => s.notificationPrefs.locationOptIn);
  const { data: me } = useGetMeQuery(undefined, { skip: !hydrated });
  const [setConsent] = useSetGeoConsentMutation();
  const syncedOnce = useRef(false);

  useEffect(() => {
    if (!me || !hydrated || syncedOnce.current) return;
    syncedOnce.current = true;
    if (pending) {
      void setConsent(localOptIn)
        .unwrap()
        .then(() => dispatch(setConsentSyncPending(false)))
        .catch(() => undefined); // still pending — retried next launch
    } else if (me.location_consent !== localOptIn) {
      dispatch(setLocationOptIn(me.location_consent));
    }
  }, [me, hydrated, pending, localOptIn, setConsent, dispatch]);

  return null;
}
