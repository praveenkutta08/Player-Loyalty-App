import React, { createContext, useContext, useMemo } from 'react';

import type { FeatureFlags } from '@repo/shared-types';

/**
 * Feature-flag context. Flags come from the tenant manifest (hydrated in P4.2); a false/absent flag
 * hides its module. Skeleton here — the launch flow feeds real flags in next. An absent flag reads
 * as disabled so nothing brand-specific shows before the manifest resolves.
 */
export interface FeatureContextValue {
  flags: FeatureFlags;
  isEnabled: (flag: string) => boolean;
}

const FeatureContext = createContext<FeatureContextValue | null>(null);

export function FeatureProvider({
  children,
  flags = {},
}: {
  children: React.ReactNode;
  flags?: FeatureFlags;
}): React.JSX.Element {
  const value = useMemo<FeatureContextValue>(
    () => ({ flags, isEnabled: (flag: string) => flags[flag] === true }),
    [flags],
  );
  return <FeatureContext.Provider value={value}>{children}</FeatureContext.Provider>;
}

export function useFeatures(): FeatureContextValue {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error('useFeatures must be used within a FeatureProvider');
  return ctx;
}

/** Convenience hook: is a single flag enabled? */
export function useFeature(flag: string): boolean {
  return useFeatures().isEnabled(flag);
}
