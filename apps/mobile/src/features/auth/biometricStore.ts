import { secureStore } from '../../native/secureStore';

/**
 * On-device persistence for the biometric-unlock preference and the passcode fallback. Both live in
 * the OS Keychain/Keystore (GOLDEN RULE #6) — never in JS storage — and never leave the device; the
 * backend still validates the refresh token on unlock.
 */
const ENABLED_KEY = 'player.biometric.enabled';
const PASSCODE_KEY = 'player.passcode';

/** A valid fallback passcode is 4–6 digits. */
export function isValidPasscode(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await secureStore.setToken(ENABLED_KEY, '1');
  else await secureStore.removeToken(ENABLED_KEY);
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await secureStore.getToken(ENABLED_KEY)) === '1';
}

export async function setPasscode(pin: string): Promise<void> {
  await secureStore.setToken(PASSCODE_KEY, pin);
}

export async function hasPasscode(): Promise<boolean> {
  return (await secureStore.getToken(PASSCODE_KEY)) !== null;
}

export async function verifyPasscode(pin: string): Promise<boolean> {
  const stored = await secureStore.getToken(PASSCODE_KEY);
  return stored !== null && stored === pin;
}

/** Turn off biometric unlock and forget the passcode (e.g. on disable or logout). */
export async function clearBiometric(): Promise<void> {
  await secureStore.removeToken(ENABLED_KEY);
  await secureStore.removeToken(PASSCODE_KEY);
}
