import * as Keychain from 'react-native-keychain';

/**
 * Secure storage wrapper (GOLDEN RULE #6). Player JWTs live in the OS keychain / keystore, never
 * in JS-accessible storage. Native access is isolated behind this TS interface so the rest of the
 * app depends only on the contract; P4.13 layers biometric gating on top of the same store.
 */
export interface SecureStore {
  setToken(key: string, value: string): Promise<void>;
  getToken(key: string): Promise<string | null>;
  removeToken(key: string): Promise<void>;
}

// H8: keep every secret entry pinned to THIS device — `WHEN_UNLOCKED_THIS_DEVICE_ONLY` blocks the
// item from syncing to iCloud Keychain or restoring onto another device via backup, so a leaked
// backup can't resurrect a refresh token or passcode hash elsewhere. It still permits the silent
// background token refresh (no per-read biometric prompt), which a biometric ACCESS_CONTROL on the
// refresh entry would break — the passcode gate below is what enforces user presence on unlock.
const DEVICE_ONLY = {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

export const secureStore: SecureStore = {
  async setToken(key, value) {
    await Keychain.setGenericPassword(key, value, { service: key, ...DEVICE_ONLY });
  },
  async getToken(key) {
    const result = await Keychain.getGenericPassword({ service: key });
    return result ? result.password : null;
  },
  async removeToken(key) {
    await Keychain.resetGenericPassword({ service: key });
  },
};
