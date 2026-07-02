/**
 * Cardless BLE wrapper (react-native-ble-plx in P4.6). Stubbed here — the real simulated-peripheral
 * pairing + QR fallback land with the wallet feature. Kept behind this contract so domain code
 * never imports the native module directly.
 */
export interface BleModule {
  scanForMachines(): Promise<Array<{ id: string; name: string; rssi: number }>>;
  connect(machineId: string): Promise<{ sessionId: string }>;
  disconnect(sessionId: string): Promise<void>;
}

const notImplemented = (): never => {
  throw new Error('BLE is implemented in P4.6 (wallet & cardless).');
};

export const ble: BleModule = {
  scanForMachines: notImplemented,
  connect: notImplemented,
  disconnect: notImplemented,
};
