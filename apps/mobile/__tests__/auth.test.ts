import Keychain from 'react-native-keychain';

import { store } from '../src/app/store';
import authReducer, {
  clearSession,
  setAccessToken,
  setUnauthenticated,
} from '../src/features/auth/authSlice';
import { errorMessage } from '../src/features/auth/errors';
import { logout, persistTokens } from '../src/features/auth/session';

describe('authSlice', () => {
  const initial = { status: 'restoring' as const, accessToken: null };

  it('authenticates on setAccessToken', () => {
    const next = authReducer(initial, setAccessToken('abc'));
    expect(next).toEqual({ status: 'authenticated', accessToken: 'abc' });
  });

  it('clears on clearSession and marks unauthenticated', () => {
    const authed = { status: 'authenticated' as const, accessToken: 'abc' };
    expect(authReducer(authed, clearSession())).toEqual({
      status: 'unauthenticated',
      accessToken: null,
    });
    expect(authReducer(authed, setUnauthenticated()).status).toBe('unauthenticated');
  });
});

describe('errorMessage', () => {
  it('prefers problem+json detail then title, else falls back', () => {
    expect(errorMessage({ data: { detail: 'Bad code' } }, 'fb')).toBe('Bad code');
    expect(errorMessage({ data: { title: 'Unauthorized' } }, 'fb')).toBe('Unauthorized');
    expect(errorMessage({ status: 'FETCH_ERROR' }, 'fb')).toMatch(/network/i);
    expect(errorMessage(undefined, 'fb')).toBe('fb');
  });
});

describe('session persistence', () => {
  it('stores the access token in state and the refresh token in the keychain, then clears both', async () => {
    await persistTokens({ access_token: 'at', refresh_token: 'rt', token_type: 'bearer' });
    expect(store.getState().auth).toEqual({ status: 'authenticated', accessToken: 'at' });
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith('player.refresh', 'rt', {
      service: 'player.refresh',
    });

    await logout();
    expect(store.getState().auth.status).toBe('unauthenticated');
    expect(store.getState().auth.accessToken).toBeNull();
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({ service: 'player.refresh' });
  });
});
