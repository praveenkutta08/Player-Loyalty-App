import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import 'maplibre-gl/dist/maplibre-gl.css';

import { circlePolygon } from './circle';

import type { Zone } from './geoApi';

export interface DraftPoint {
  lng: number;
  lat: number;
  radius: number;
}

// MapLibre GL map for the geofence editor. Free demo tiles (no API key). Click to drop a point;
// existing GPS zones + the in-progress draft render as circle overlays.
export function MapView({
  zones,
  draft,
  onPick,
  center = [-115.1728, 36.1147],
}: {
  zones: Zone[];
  draft: DraftPoint | null;
  onPick: (lng: number, lat: number) => void;
  center?: [number, number];
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const loaded = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!container.current || map.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center,
      zoom: 15,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('click', (e) => onPickRef.current(e.lngLat.lng, e.lngLat.lat));
    m.on('load', () => {
      // MapLibre paint values can't reference CSS vars, so read the design token once from the
      // document so geofence overlays track the theme instead of a hardcoded gold (M14).
      const gold =
        getComputedStyle(document.documentElement).getPropertyValue('--gold-fill').trim() ||
        '#E6B450';
      m.addSource('zones', { type: 'geojson', data: featureCollection([]) });
      m.addLayer({
        id: 'zones-fill',
        type: 'fill',
        source: 'zones',
        paint: { 'fill-color': gold, 'fill-opacity': 0.18 },
      });
      m.addLayer({
        id: 'zones-line',
        type: 'line',
        source: 'zones',
        paint: { 'line-color': gold, 'line-width': 2 },
      });
      loaded.current = true;
      syncData(m, zones, draft);
    });
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      loaded.current = false;
    };
    // Initialize the map once; overlay updates are handled by the effect below.
  }, []);

  // Re-render overlays when zones or the draft change.
  useEffect(() => {
    if (map.current && loaded.current) syncData(map.current, zones, draft);
  }, [zones, draft]);

  return (
    <div
      ref={container}
      className="h-[420px] w-full overflow-hidden rounded-card border border-border"
    />
  );
}

function featureCollection(features: unknown[]) {
  return {
    type: 'FeatureCollection',
    features,
  } as unknown as maplibregl.GeoJSONSourceSpecification['data'];
}

function syncData(m: maplibregl.Map, zones: Zone[], draft: DraftPoint | null) {
  const features = zones
    .filter((z) => z.center_lat != null && z.center_lng != null && z.radius_m != null)
    .map((z) => circlePolygon(z.center_lng!, z.center_lat!, z.radius_m!));
  if (draft) features.push(circlePolygon(draft.lng, draft.lat, draft.radius));
  const source = m.getSource('zones') as maplibregl.GeoJSONSource | undefined;
  source?.setData(featureCollection(features));
}
