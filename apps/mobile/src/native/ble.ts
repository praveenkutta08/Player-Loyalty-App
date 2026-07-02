/**
 * Cardless BLE wrapper. The MVP ships a SIMULATED peripheral (mock) so the pairing flow is fully
 * demoable without a physical EGM or a native build: `scanForMachines` resolves a fixed set of
 * nearby machines (strongest signal first), `connect`/`disconnect` mint/close a local session id.
 *
 * The real `react-native-ble-plx` implementation swaps in behind this exact contract later; domain
 * code (the pairing screens) only ever imports this module, never the native library directly.
 */
import uuid from 'react-native-uuid';

export interface BleMachine {
  /** EGM identifier the wallet transfer API pairs against. */
  id: string;
  name: string;
  /** Signal strength in dBm (closer to 0 = nearer). */
  rssi: number;
}

export interface BleModule {
  scanForMachines(): Promise<BleMachine[]>;
  connect(machineId: string): Promise<{ sessionId: string }>;
  disconnect(sessionId: string): Promise<void>;
}

/** Simulated advertising peripherals — stands in for BLE-advertising EGMs on the floor. */
const SIMULATED_MACHINES: readonly BleMachine[] = [
  { id: 'EGM-1042', name: 'Dragon Riches', rssi: -47 },
  { id: 'EGM-2087', name: 'Golden Buffalo', rssi: -58 },
  { id: 'EGM-3311', name: 'Cleopatra Gold', rssi: -66 },
  { id: 'EGM-4550', name: 'Mega Fortune Deluxe', rssi: -74 },
];

/** Pure view of the simulated scan result: nearest (strongest signal) first. */
export function simulatedMachines(): BleMachine[] {
  return [...SIMULATED_MACHINES].sort((a, b) => b.rssi - a.rssi);
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Open sessions (sessionId → machineId), so disconnect is a real teardown in the mock. */
const openSessions = new Map<string, string>();

export const ble: BleModule = {
  async scanForMachines() {
    // Model the short discovery window a real BLE scan takes.
    await delay(900);
    return simulatedMachines();
  },
  async connect(machineId: string) {
    await delay(600);
    const sessionId = String(uuid.v4());
    openSessions.set(sessionId, machineId);
    return { sessionId };
  },
  async disconnect(sessionId: string) {
    await delay(200);
    openSessions.delete(sessionId);
  },
};
