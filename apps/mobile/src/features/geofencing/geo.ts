/**
 * Pure geofencing helpers: distance math, nearest-zone selection (iOS monitors ~20 regions max),
 * and a dwell tracker that emits a dwell event exactly once per continuous presence. Kept pure so
 * the enter/dwell/exit logic is deterministic and unit-tested independent of the native modules.
 */

/** iOS caps simultaneously-monitored regions at 20; sync only the nearest. */
export const MAX_MONITORED_ZONES = 20;

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Zone {
  id: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_m: number | null;
}

/** Great-circle distance in metres between two points (haversine). */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * The nearest GPS zones to an origin, capped at `limit` (default the iOS region limit). Zones
 * without coordinates are dropped (they can't be OS-monitored).
 */
export function nearestZones<T extends Zone>(
  zones: T[],
  origin: GeoPoint,
  limit: number = MAX_MONITORED_ZONES,
): T[] {
  return zones
    .filter((z): z is T => z.center_lat != null && z.center_lng != null)
    .map((z) => ({
      zone: z,
      distance: haversineMeters(origin, { lat: z.center_lat as number, lng: z.center_lng as number }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((entry) => entry.zone);
}

/**
 * Tracks presence in a single zone and fires `dwell` once after continuous presence for the
 * threshold. Exiting resets it, so re-entering and dwelling again fires a fresh event — but a single
 * uninterrupted visit never double-fires (the "exactly one promo push" guarantee).
 */
export class DwellTracker {
  private enteredAt: number | null = null;
  private dwellFired = false;

  constructor(private readonly thresholdMs: number) {}

  /** Region enter at time `now` (ms). */
  enter(now: number): void {
    this.enteredAt = now;
    this.dwellFired = false;
  }

  /** Region exit — clears presence. */
  exit(): void {
    this.enteredAt = null;
    this.dwellFired = false;
  }

  /** Poll at time `now`; returns 'dwell' the first time the threshold is crossed, else null. */
  sample(now: number): 'dwell' | null {
    if (this.enteredAt === null || this.dwellFired) return null;
    if (now - this.enteredAt >= this.thresholdMs) {
      this.dwellFired = true;
      return 'dwell';
    }
    return null;
  }

  get present(): boolean {
    return this.enteredAt !== null;
  }
}
