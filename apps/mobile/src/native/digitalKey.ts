/**
 * Digital-key SDK wrapper. The MVP ships a STUB that simulates the on-device radio handshake with
 * the lock (mock ASSA ABLOY / Salto) — a real SDK swaps in behind this same contract later. Domain
 * code (the Digital Key screen) calls this for the local unlock, then the backend authorizes/audits
 * the unlock via DigitalKeyPort.
 */
export type UnlockStatus = 'unlocked' | 'denied' | 'error';

export interface DigitalKeyModule {
  unlock(keyRef: string): Promise<{ status: UnlockStatus }>;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const digitalKey: DigitalKeyModule = {
  async unlock(keyRef: string) {
    // Model the ~1s BLE/NFC handshake with the door. A missing key ref means the SDK has nothing
    // provisioned to present — the same failure a real SDK returns.
    await delay(800);
    return { status: keyRef ? 'unlocked' : 'error' };
  },
};
