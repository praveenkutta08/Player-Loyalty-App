import {
  constantTimeEqual,
  fromHex,
  pbkdf2Sha256,
  randomSalt,
  toHex,
  utf8,
} from '../../native/crypto/pbkdf2';
import { secureStore } from '../../native/secureStore';

/**
 * On-device persistence for the biometric-unlock preference and the passcode fallback. Both live in
 * the OS Keychain/Keystore (GOLDEN RULE #6) — never in JS storage — and never leave the device; the
 * backend still validates the refresh token on unlock.
 *
 * H8: the passcode is never stored in the clear. We keep a salted PBKDF2-HMAC-SHA256 hash and verify
 * against it in constant time, so an extracted Keychain blob yields no recoverable PIN.
 */
const ENABLED_KEY = 'player.biometric.enabled';
const PASSCODE_KEY = 'player.passcode';

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

interface PasscodeRecord {
  v: 1;
  salt: string; // hex
  hash: string; // hex, PBKDF2-HMAC-SHA256(pin, salt, iters)
  iters: number;
}

/** A valid fallback passcode is 4–6 digits. */
export function isValidPasscode(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

function deriveRecord(pin: string, salt: Uint8Array, iters: number): PasscodeRecord {
  const hash = pbkdf2Sha256(utf8(pin), salt, iters, 32);
  return { v: 1, salt: toHex(salt), hash: toHex(hash), iters };
}

function parseRecord(stored: string): PasscodeRecord | null {
  try {
    const obj = JSON.parse(stored) as PasscodeRecord;
    if (obj && obj.v === 1 && typeof obj.salt === 'string' && typeof obj.hash === 'string') {
      return obj;
    }
  } catch {
    // Not JSON — a legacy plaintext PIN (pre-H8). Caller handles migration.
  }
  return null;
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  if (enabled) await secureStore.setToken(ENABLED_KEY, '1');
  else await secureStore.removeToken(ENABLED_KEY);
}

export async function isBiometricEnabled(): Promise<boolean> {
  return (await secureStore.getToken(ENABLED_KEY)) === '1';
}

export async function setPasscode(pin: string): Promise<void> {
  const record = deriveRecord(pin, randomSalt(SALT_BYTES), PBKDF2_ITERATIONS);
  await secureStore.setToken(PASSCODE_KEY, JSON.stringify(record));
}

export async function hasPasscode(): Promise<boolean> {
  return (await secureStore.getToken(PASSCODE_KEY)) !== null;
}

export async function verifyPasscode(pin: string): Promise<boolean> {
  const stored = await secureStore.getToken(PASSCODE_KEY);
  if (stored === null) return false;

  const record = parseRecord(stored);
  if (record === null) {
    // Legacy plaintext PIN written before H8 — verify by equality, then upgrade to a hash in place
    // so the cleartext is overwritten on the next successful unlock.
    if (isValidPasscode(stored) && constantTimeEqual(stored, pin)) {
      await setPasscode(pin);
      return true;
    }
    return false;
  }

  const candidate = pbkdf2Sha256(utf8(pin), fromHex(record.salt), record.iters, 32);
  return constantTimeEqual(toHex(candidate), record.hash);
}

/** Turn off biometric unlock and forget the passcode (e.g. on disable or logout). */
export async function clearBiometric(): Promise<void> {
  await secureStore.removeToken(ENABLED_KEY);
  await secureStore.removeToken(PASSCODE_KEY);
}
