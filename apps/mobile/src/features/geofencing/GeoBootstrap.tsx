import { useEffect } from 'react';

import { useAppSelector } from '../../app/store';
import { beacons } from '../../native/beacons';
import { geofence } from '../../native/geofence';

import { nearestZones } from './geo';
import { useGetGeoSyncQuery } from './geoApi';

import type { GeoPoint } from './geo';

/**
 * On launch (once location consent is granted): sync the tenant's zones/beacons and register the
 * nearest zones with the OS region monitor (respecting the ~20 limit) + start beacon ranging.
 * Renders nothing. Without device GPS in the MVP, the first zone's centre stands in as the origin.
 */
export function GeoBootstrap(): null {
  const optedIn = useAppSelector((s) => s.notificationPrefs.locationOptIn);
  const { data } = useGetGeoSyncQuery(undefined, { skip: !optedIn });

  useEffect(() => {
    if (!optedIn || !data) {
      void geofence.clearZones();
      void beacons.stopRanging();
      return;
    }
    const withCoords = data.zones.filter((z) => z.center_lat != null && z.center_lng != null);
    const origin: GeoPoint | null = withCoords[0]
      ? { lat: withCoords[0].center_lat as number, lng: withCoords[0].center_lng as number }
      : null;
    if (origin) {
      const nearest = nearestZones(withCoords, origin);
      void geofence.registerZones(
        nearest.map((z) => ({
          id: z.id,
          lat: z.center_lat as number,
          lng: z.center_lng as number,
          radius: z.radius_m ?? 100,
        })),
      );
    }
    void beacons.startRanging(data.beacons.map((b) => b.uuid_));
  }, [optedIn, data]);

  return null;
}
