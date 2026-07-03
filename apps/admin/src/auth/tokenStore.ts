// H5: the admin ACCESS token lives only in memory (a module variable), never in localStorage —
// so an XSS payload can't exfiltrate a persisted token, and there's nothing to steal after a tab
// close. The REFRESH token is never handled by JS at all: the backend delivers it as an httpOnly,
// SameSite=Strict cookie (see apps/backend identity router), and the browser attaches it
// automatically on /auth/admin/refresh. On reload the SPA silently re-mints an access token from
// that cookie (see AuthGate), so sessions still survive a refresh.
//
// Two-audience rule: these are ADMIN-audience tokens only (the mobile app uses its own
// player-audience tokens via react-native-keychain).
let accessToken: string | null = null;

export const tokenStore = {
  getAccess: (): string | null => accessToken,
  setAccess: (token: string): void => {
    accessToken = token;
  },
  clear: (): void => {
    accessToken = null;
  },
};
