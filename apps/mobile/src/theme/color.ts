/**
 * Small color helpers for the obsidian glass system. Keeps components token-driven: they pass a
 * theme hex plus an alpha, rather than hardcoding rgba() literals (guardrail: no hardcoded color).
 */

/** Convert a `#rrggbb` (or `#rgb`) hex to an `rgba(...)` string at the given alpha (0–1). */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
