import {
  DwellTracker,
  haversineMeters,
  MAX_MONITORED_ZONES,
  nearestZones,
} from '../src/features/geofencing/geo';

import type { Zone } from '../src/features/geofencing/geo';

const zone = (id: string, lat: number | null, lng: number | null): Zone => ({
  id,
  center_lat: lat,
  center_lng: lng,
  radius_m: 100,
});

describe('haversineMeters', () => {
  it('is ~0 for the same point and positive otherwise', () => {
    expect(haversineMeters({ lat: 40, lng: -74 }, { lat: 40, lng: -74 })).toBeCloseTo(0, 5);
    // ~1.11 km per 0.01 deg latitude.
    expect(haversineMeters({ lat: 40, lng: -74 }, { lat: 40.01, lng: -74 })).toBeGreaterThan(1000);
  });
});

describe('nearestZones', () => {
  const origin = { lat: 40, lng: -74 };

  it('sorts by distance and drops zones without coordinates', () => {
    const zones = [zone('far', 41, -74), zone('near', 40.001, -74), zone('nocoord', null, null)];
    const result = nearestZones(zones, origin);
    expect(result.map((z) => z.id)).toEqual(['near', 'far']);
  });

  it('caps at the monitored-region limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => zone(`z${i}`, 40 + i * 0.001, -74));
    expect(nearestZones(many, origin)).toHaveLength(MAX_MONITORED_ZONES);
  });
});

describe('DwellTracker', () => {
  const TEN_MIN = 10 * 60 * 1000;

  it('fires dwell exactly once after continuous presence past the threshold', () => {
    const t = new DwellTracker(TEN_MIN);
    t.enter(0);
    expect(t.sample(TEN_MIN - 1)).toBeNull(); // not yet
    expect(t.sample(TEN_MIN)).toBe('dwell'); // crosses threshold
    expect(t.sample(TEN_MIN + 5000)).toBeNull(); // no double-fire
  });

  it('resets on exit so a fresh visit can dwell again', () => {
    const t = new DwellTracker(TEN_MIN);
    t.enter(0);
    expect(t.sample(TEN_MIN)).toBe('dwell');
    t.exit();
    expect(t.present).toBe(false);
    t.enter(TEN_MIN * 2);
    expect(t.sample(TEN_MIN * 3)).toBe('dwell');
  });

  it('does not fire without an enter', () => {
    const t = new DwellTracker(TEN_MIN);
    expect(t.sample(TEN_MIN * 5)).toBeNull();
  });
});
