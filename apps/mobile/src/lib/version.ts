/**
 * Dotted-version comparison for the force-update gate (G8/M16). Non-numeric segments are
 * treated as 0; missing segments compare as 0 (so "1.2" == "1.2.0").
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((s) => parseInt(s, 10) || 0);
  const pb = b.split('.').map((s) => parseInt(s, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da < db ? -1 : 1;
  }
  return 0;
}

/**
 * True when the running build is below the manifest's minimum supported version.
 * No / empty / malformed floor -> never force (the gate must not brick the app on bad config).
 */
export function needsForceUpdate(current: string, minimum?: string | null): boolean {
  if (!minimum || !/^\d+(\.\d+)*$/.test(minimum.trim())) return false;
  return compareVersions(current, minimum.trim()) < 0;
}
