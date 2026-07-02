import { Alert } from 'react-native';

import { useAppDispatch } from '../../app/store';
import { setConsentSyncPending, setLocationOptIn } from '../notifications/prefsSlice';

import { useSetGeoConsentMutation } from './geoApi';

/**
 * H7 — server-first location consent. The local opt-in mirror only flips when the server
 * write succeeds, with one deliberate exception: a FAILED opt-out still tears down locally
 * (privacy fail-safe) and queues a retry (`consentSyncPending`, replayed by
 * ServerConsentSync on next launch). Used by both the consent screen and the preferences
 * toggle so neither can silently diverge from the recorded consent.
 */
export function useLocationConsent(): {
  decide: (granted: boolean) => Promise<boolean>;
  isLoading: boolean;
} {
  const dispatch = useAppDispatch();
  const [setConsent, { isLoading }] = useSetGeoConsentMutation();

  async function decide(granted: boolean): Promise<boolean> {
    try {
      await setConsent(granted).unwrap();
      dispatch(setLocationOptIn(granted));
      dispatch(setConsentSyncPending(false));
      return true;
    } catch {
      if (!granted) {
        // Fail-safe teardown: never keep tracking because the network was down.
        dispatch(setLocationOptIn(false));
        dispatch(setConsentSyncPending(true));
        return true;
      }
      Alert.alert(
        'Couldn’t update location preference',
        'Please check your connection and try again.',
      );
      return false;
    }
  }

  return { decide, isLoading };
}
