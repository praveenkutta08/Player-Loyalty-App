// Approximate a geodesic circle (meters) as a 64-point polygon for rendering geofence zones on
// the map without pulling in a geo library. Returns a GeoJSON Feature<Polygon>-shaped object.
export interface CircleFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
}

export function circlePolygon(
  lng: number,
  lat: number,
  radiusMeters: number,
  points = 64,
): CircleFeature {
  const coords: [number, number][] = [];
  const earth = 6378137;
  const dLat = (radiusMeters / earth) * (180 / Math.PI);
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= points; i += 1) {
    const theta = (i / points) * 2 * Math.PI;
    coords.push([lng + dLng * Math.cos(theta), lat + dLat * Math.sin(theta)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [coords] } };
}
