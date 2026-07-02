/**
 * OS region-monitoring wrapper (iOS Core Location / Android Geofencing in P4.10). Stubbed until the
 * geofencing feature. Respects the iOS ~20 monitored-region limit by only registering nearest zones
 * (see P4.10). Kept behind this contract so domain code never touches the native module.
 */
export interface GeofenceModule {
  registerZones(
    zones: Array<{ id: string; lat: number; lng: number; radius: number }>,
  ): Promise<void>;
  clearZones(): Promise<void>;
}

const notImplemented = (): never => {
  throw new Error('Geofencing is implemented in P4.10 (geofencing & beacons).');
};

export const geofence: GeofenceModule = {
  registerZones: notImplemented,
  clearZones: notImplemented,
};
