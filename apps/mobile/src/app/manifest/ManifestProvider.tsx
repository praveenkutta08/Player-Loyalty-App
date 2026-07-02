import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiBaseUrl } from '@repo/api-client';

import { buildConfig } from '../../config/buildConfig';
import { useGetManifestQuery } from './manifestApi';
import { normalizeManifest } from './normalize';

import type { ResolvedManifest } from './normalize';

/** Manifest lifecycle state. `offline` = serving a cached manifest because the fetch failed. */
export type ManifestStatus = 'loading' | 'ready' | 'offline' | 'error';

export interface ManifestContextValue {
  manifest: ResolvedManifest | null;
  status: ManifestStatus;
  refetch: () => void;
}

const ManifestContext = createContext<ManifestContextValue | null>(null);

const cacheKey = (tenantId: string): string => `manifest:${tenantId}`;

/**
 * Resolves the tenant manifest on launch and keeps it fresh. It hydrates instantly from an
 * AsyncStorage cache (so a returning user sees their brand with no flash), fetches the latest in
 * the background, and — when the network is unavailable — falls back to the cache and reports
 * `offline`. On success it caches by version and points the API client at the tenant's base URL.
 */
export function ManifestProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const tenantId = buildConfig.tenantId;
  const [cached, setCached] = useState<ResolvedManifest | null>(null);
  const [cacheChecked, setCacheChecked] = useState(false);

  // Hydrate from cache first.
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(cacheKey(tenantId))
      .then((raw) => {
        if (active && raw) {
          const parsed = JSON.parse(raw) as ResolvedManifest;
          setCached(parsed);
          setApiBaseUrl(parsed.apiBaseUrl);
        }
      })
      .catch(() => undefined)
      .finally(() => active && setCacheChecked(true));
    return () => {
      active = false;
    };
  }, [tenantId]);

  const { data, error, isFetching, refetch } = useGetManifestQuery({ tenantId });

  const [fresh, setFresh] = useState<ResolvedManifest | null>(null);
  useEffect(() => {
    if (!data) return;
    const resolved = normalizeManifest(data);
    setFresh(resolved);
    setApiBaseUrl(resolved.apiBaseUrl);
    AsyncStorage.setItem(cacheKey(tenantId), JSON.stringify(resolved)).catch(() => undefined);
  }, [data, tenantId]);

  const value = useMemo<ManifestContextValue>(() => {
    const manifest = fresh ?? cached;
    let status: ManifestStatus;
    if (fresh) status = 'ready';
    else if (error && cached) status = 'offline';
    else if (error && cacheChecked) status = 'error';
    else status = 'loading';
    return { manifest, status, refetch };
  }, [fresh, cached, error, cacheChecked, refetch]);

  // Kept available for a future in-flight indicator; referenced to avoid an unused-var lint.
  void isFetching;

  return <ManifestContext.Provider value={value}>{children}</ManifestContext.Provider>;
}

export function useManifest(): ManifestContextValue {
  const ctx = useContext(ManifestContext);
  if (!ctx) throw new Error('useManifest must be used within a ManifestProvider');
  return ctx;
}
