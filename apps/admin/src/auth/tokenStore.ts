import type { TokenPair } from './types';

// Admin tokens live in localStorage. Two-audience rule: these are ADMIN-audience tokens only
// (the mobile app uses its own player-audience tokens via react-native-keychain).
const ACCESS_KEY = 'casinoops.access';
const REFRESH_KEY = 'casinoops.refresh';

export const tokenStore = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  set: (tokens: TokenPair): void => {
    localStorage.setItem(ACCESS_KEY, tokens.access_token);
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
