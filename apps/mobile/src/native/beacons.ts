/**
 * iBeacon ranging wrapper (react-native-beacons-manager in P4.10) for indoor dwell detection.
 * Stubbed until the geofencing feature; kept behind this contract per the app's native-isolation rule.
 */
export interface BeaconsModule {
  startRanging(zoneUuids: string[]): Promise<void>;
  stopRanging(): Promise<void>;
}

const notImplemented = (): never => {
  throw new Error('Beacon ranging is implemented in P4.10 (geofencing & beacons).');
};

export const beacons: BeaconsModule = {
  startRanging: notImplemented,
  stopRanging: notImplemented,
};
