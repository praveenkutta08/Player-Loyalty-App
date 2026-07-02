/**
 * Digital-key SDK wrapper (mock ASSA ABLOY / Salto in P4.8; real SDK swaps in later). Stubbed here;
 * the real issue/store/unlock UX lands with the digital-key feature behind the DigitalKeyPort contract.
 */
export interface DigitalKeyModule {
  unlock(keyRef: string): Promise<{ status: 'unlocked' | 'denied' | 'error' }>;
}

const notImplemented = (): never => {
  throw new Error('Digital key is implemented in P4.8 (digital key).');
};

export const digitalKey: DigitalKeyModule = {
  unlock: notImplemented,
};
