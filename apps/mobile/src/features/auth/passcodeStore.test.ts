import * as Keychain from 'react-native-keychain';

import { secureStore } from '../../native/secureStore';

import { hasPasscode, setPasscode, verifyPasscode } from './biometricStore';

const PASSCODE_KEY = 'player.passcode';

// H8 — the passcode must never be recoverable in the clear from the Keychain, and a legacy plaintext
// PIN must upgrade to a hash on the next successful unlock.
describe('passcode storage (H8)', () => {
  beforeEach(async () => {
    await secureStore.removeToken(PASSCODE_KEY);
    jest.clearAllMocks();
  });

  it('does not persist the raw PIN anywhere in the stored value', async () => {
    await setPasscode('1234');

    const raw = await secureStore.getToken(PASSCODE_KEY);
    expect(raw).not.toBeNull();
    expect(raw).not.toBe('1234'); // not stored verbatim
    expect(raw).not.toContain('1234'); // and not embedded in the record
    // The record is a salted hash, not the digits.
    const record = JSON.parse(raw as string);
    expect(record.v).toBe(1);
    expect(record.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(record.salt).toMatch(/^[0-9a-f]+$/);
  });

  it('verifies the correct PIN and rejects a wrong one', async () => {
    await setPasscode('4821');
    expect(await verifyPasscode('4821')).toBe(true);
    expect(await verifyPasscode('0000')).toBe(false);
    expect(await verifyPasscode('48210')).toBe(false);
  });

  it('uses a fresh random salt per set (same PIN → different hash)', async () => {
    await setPasscode('4821');
    const a = JSON.parse((await secureStore.getToken(PASSCODE_KEY)) as string);
    await setPasscode('4821');
    const b = JSON.parse((await secureStore.getToken(PASSCODE_KEY)) as string);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('migrates a legacy plaintext PIN to a hash on first successful verify', async () => {
    // Simulate a pre-H8 store: the raw PIN written directly.
    await Keychain.setGenericPassword(PASSCODE_KEY, '1234', { service: PASSCODE_KEY });
    expect(await secureStore.getToken(PASSCODE_KEY)).toBe('1234');

    // A wrong PIN neither unlocks nor migrates.
    expect(await verifyPasscode('9999')).toBe(false);
    expect(await secureStore.getToken(PASSCODE_KEY)).toBe('1234');

    // The correct PIN unlocks AND upgrades the stored value to a hash.
    expect(await verifyPasscode('1234')).toBe(true);
    const upgraded = await secureStore.getToken(PASSCODE_KEY);
    expect(upgraded).not.toBe('1234');
    expect(upgraded).not.toContain('1234');
    // Subsequent verification works against the hashed form.
    expect(await verifyPasscode('1234')).toBe(true);
    expect(await hasPasscode()).toBe(true);
  });
});
