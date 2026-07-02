/**
 * iBeacon ranging wrapper (react-native-beacons-manager in the real build) for indoor dwell. The
 * MVP ships a JS mock that records the ranged UUIDs — beacon ranging needs a native build. Kept
 * behind this contract per the app's native-isolation rule.
 */
export interface BeaconsModule {
  startRanging(zoneUuids: string[]): Promise<void>;
  stopRanging(): Promise<void>;
  /** Currently-ranged region UUIDs (mock introspection for the demo/tests). */
  ranging(): string[];
}

let ranged: string[] = [];

export const beacons: BeaconsModule = {
  async startRanging(zoneUuids: string[]) {
    ranged = [...zoneUuids];
  },
  async stopRanging() {
    ranged = [];
  },
  ranging() {
    return ranged;
  },
};
