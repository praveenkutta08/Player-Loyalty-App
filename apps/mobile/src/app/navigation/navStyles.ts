/**
 * navigation.style — the two bar skins (P7.4), DESIGNED HERE (no design file, by decision):
 * derived from the app's design tokens and the splash handoff's visual language (display serif +
 * Manrope, hairline strokes, primary-color-only glows, restrained motion).
 *
 * These are VISUAL treatments only. The Option B structure (Home · Offers · center Scan/Play ·
 * Account · More), the manifest `navigation.tabs`, the center action's cashless-flag fallback,
 * deep links and tab state are identical in both styles.
 *
 * ── EDITORIAL (default) — classic docked bar, label-forward ──────────────────────────────────
 *   bar:    full-width, docked; height 56dp + bottom safe-area inset as paddingBottom;
 *           background bg.base; hairline (StyleSheet.hairlineWidth) TOP border in border.soft.
 *   items:  icon 22dp; label 11sp fontFamily.sans, letterSpacing 0.4, 3dp below the icon,
 *           ALWAYS visible (label-forward). Active: brand.gold icon + label (weight '600');
 *           inactive: text.muted. No indicator chrome — the type carries the state.
 *   center: inline 40dp brand.gold filled circle around the icon (onGold glyph), gold label.
 *
 * ── FLOATING PILL — detached pill, icon-forward ──────────────────────────────────────────────
 *   bar:    detached; horizontal margin 16dp; bottom offset max(safeAreaBottom, 12) + 8dp;
 *           height 64dp; borderRadius 32 (fixed preset); hairline border all round in
 *           border.soft; elevation preset: shadow #000 opacity 0.30 radius 16 offset (0, 8) /
 *           Android elevation 12. Background: translucent bg.elevated (iOS ~0.92 — the cheap
 *           stand-in for native blur; Android stays a translucent solid per the spec: no
 *           RenderScript/heavy blur).
 *   items:  icon 22dp, icon-forward: labels hidden; active = brand.gold icon + a 4dp gold dot
 *           8dp beneath; inactive = text.muted.
 *   center: 48dp brand.gold filled circle raised 14dp above the pill top, primary-color-only
 *           glow (shadowColor brand.gold, opacity 0.45, radius 12 / elevation 8), onGold glyph.
 *
 * Both styles: theme tokens only (active/inactive from the manifest palette); keyboard hides the
 * bar; static state changes (no transitions) so OS reduced-motion is respected by construction.
 */

export type NavStyleKey = 'floatingPill' | 'editorial';

export const DEFAULT_NAV_STYLE: NavStyleKey = 'editorial';

/** Unknown/missing manifest value → editorial + a console warning (read-side fallback). */
export function resolveNavStyle(raw: unknown): NavStyleKey {
  if (raw === 'floatingPill' || raw === 'editorial') return raw;
  if (raw != null) {
    console.warn(
      `[nav] unknown navigation.style ${JSON.stringify(raw)} — falling back to editorial`,
    );
  }
  return DEFAULT_NAV_STYLE;
}

// Fixed per-style presets (never free-form CMS fields).
export const EDITORIAL = {
  barHeight: 56,
  iconSize: 22,
  labelSize: 11,
  labelGap: 3,
  centerBadgeSize: 40,
} as const;

export const FLOATING_PILL = {
  barHeight: 64,
  horizontalMargin: 16,
  radius: 32,
  iconSize: 22,
  activeDotSize: 4,
  centerSize: 48,
  centerRaise: 14,
} as const;

/** Editorial: the docked bar absorbs the safe-area inset as bottom padding. */
export function editorialBottomPadding(safeAreaBottom: number): number {
  return safeAreaBottom;
}

/** Floating pill: bottom offset clears the home indicator with a fixed breathing gap. */
export function pillBottomOffset(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, 12) + 8;
}
