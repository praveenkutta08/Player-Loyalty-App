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

export const secureStore: SecureStore = {
  async setToken(key, value) {
    await Keychain.setGenericPassword(key, value, { service: key });
  },
  async getToken(key) {
    const result = await Keychain.getGenericPassword({ service: key });
    return result ? result.password : null;
  },
  async removeToken(key) {
    await Keychain.resetGenericPassword({ service: key });
  },
};
