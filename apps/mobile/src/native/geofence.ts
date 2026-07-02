/**
 * OS region-monitoring wrapper (iOS Core Location / Android Geofencing in the real build). The MVP
 * ships a JS mock that just records the registered regions — background geolocation requires a
 * native build the MVP doesn't include. Respects the iOS ~20 monitored-region limit; callers pass
 * only the nearest zones. Kept behind this contract so domain code never touches the native module.
 */
export interface MonitoredZone {
  id: string;
  lat: number;
  lng: number;
  radius: number;
}

export interface GeofenceModule {
  registerZones(zones: MonitoredZone[]): Promise<void>;
  clearZones(): Promise<void>;
  /** Currently-monitored regions (mock introspection for the demo/tests). */
  monitored(): MonitoredZone[];
}

let registered: MonitoredZone[] = [];

export const geofence: GeofenceModule = {
  async registerZones(zones: MonitoredZone[]) {
    // A real impl caps at the OS limit; callers pass the pre-trimmed nearest set.
    registered = zones.slice(0, 20);
  },
  async clearZones() {
    registered = [];
  },
  monitored() {
    return registered;
  },
};
