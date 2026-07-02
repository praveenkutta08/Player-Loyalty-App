/** True for a plain (non-array, non-null) object. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursively merge `source` onto a deep clone of `base`. Plain objects merge key-by-key; arrays
 * and primitives from `source` replace `base`. Used to overlay a tenant's (often partial) manifest
 * theme onto the white-label default token tree so missing tokens fall back to defaults.
 */
export function deepMerge<T>(base: T, source: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(source)) {
    return (source === undefined ? base : (source as T));
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(source)) {
    out[key] = isPlainObject(value) && isPlainObject(out[key])
      ? deepMerge(out[key], value)
      : value;
  }
  return out as T;
}
