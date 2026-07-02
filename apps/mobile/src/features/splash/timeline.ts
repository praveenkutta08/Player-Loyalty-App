/**
 * Splash timeline math (P7.3) — ported 1:1 from the design handoff's authoritative
 * interpolation spec (design/splash/SplashScreen.dc.html, the `progress != null` branch, via
 * Splash Variant Studio). Everything here is PURE: the component samples these evaluators into
 * Animated interpolation ranges, and tests pin them against studio-sampled values.
 *
 * All variants share: a master clock t (seconds), per-element [start, end] windows with their
 * own easing, and the final 200 ms hand-off (scene fade + emblem toward the header slot:
 * translateY −190, scale → 0.42 in prototype units).
 */

// --------------------------------------------------------------------- helpers (verbatim port)
export const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
export const seg = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a));
export const eo = (x: number): number => 1 - Math.pow(1 - x, 3); // easeOutCubic
export const eio = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; // easeInOutCubic
export const expo = (x: number): number => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)); // easeOutExpo
export const back = (x: number): number => {
  const c1 = 1.3;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const lerp = (a: number, b: number, x: number): number => a + (b - a) * x;

// --------------------------------------------------------------------- durations & config
export type SplashVariantKey = 'journey' | 'collection' | 'portal' | 'silk';

/** Native master-clock durations (seconds) per the handoff. */
export const NATIVE_DURATION_S: Record<SplashVariantKey, number> = {
  journey: 2.6,
  collection: 2.4,
  portal: 2.4,
  silk: 2.2,
};

export const SPLASH_VARIANTS: SplashVariantKey[] = ['journey', 'collection', 'portal', 'silk'];
export const FALLBACK_VARIANT: SplashVariantKey = 'silk'; // NOT the handoff's `horizon`

export const DURATION_MIN_MS = 1800;
export const DURATION_MAX_MS = 3000;

export interface ResolvedSplashConfig {
  variant: SplashVariantKey;
  /** Effective master-clock duration in seconds (native, or the clamped CMS rescale). */
  durationS: number;
  backgroundValue?: [string, string];
  taglineText?: string;
  logoAssetId?: string;
  environmentTheme: string;
  environmentThemePaths?: { back: string; front: string };
}

/**
 * Resolve the manifest `splash` block into a playable config: unknown/missing variant falls
 * back to `silk` (logged by the caller), and `animationDurationMs` RESCALES the variant's
 * native timeline linearly, clamped to [1800, 3000] ms.
 */
export function resolveSplashConfig(
  raw: Record<string, unknown> | undefined | null,
): ResolvedSplashConfig {
  const rawVariant = raw?.variant;
  const variant = SPLASH_VARIANTS.includes(rawVariant as SplashVariantKey)
    ? (rawVariant as SplashVariantKey)
    : FALLBACK_VARIANT;
  let durationS = NATIVE_DURATION_S[variant];
  const requested = raw?.animation_duration_ms;
  if (typeof requested === 'number' && Number.isFinite(requested)) {
    durationS = Math.max(DURATION_MIN_MS, Math.min(DURATION_MAX_MS, requested)) / 1000;
  }
  const background = raw?.background_value;
  const paths = raw?.environment_theme_paths as { back: string; front: string } | undefined;
  return {
    variant,
    durationS,
    backgroundValue:
      Array.isArray(background) && background.length === 2
        ? [String(background[0]), String(background[1])]
        : undefined,
    taglineText: typeof raw?.tagline_text === 'string' ? raw.tagline_text : undefined,
    logoAssetId: typeof raw?.logo_asset_id === 'string' ? raw.logo_asset_id : undefined,
    environmentTheme: typeof raw?.environment_theme === 'string' ? raw.environment_theme : 'coast',
    environmentThemePaths:
      paths && typeof paths.back === 'string' && typeof paths.front === 'string'
        ? paths
        : undefined,
  };
}

/**
 * Rescale: evaluators are authored against the variant's NATIVE clock. A CMS duration rescales
 * linearly — every window keeps its proportion — so we evaluate at `t_native = t * native/actual`.
 */
export function toNativeClock(
  tActualS: number,
  variant: SplashVariantKey,
  durationS: number,
): number {
  return (tActualS * NATIVE_DURATION_S[variant]) / durationS;
}

// --------------------------------------------------------------------- shared hand-off
export interface HandOff {
  /** Root scene opacity (1 → 0 across the final 200 ms). */
  sceneOpacity: number;
  /** Emblem hand-off offsets: translateY (prototype px) and scale multiplier. */
  handY: number;
  handScale: number;
}

/** The shared final-200 ms hand-off, computed on the variant's native clock. */
export function handOff(t: number, T: number): HandOff {
  const he = eio(seg(t, T - 0.2, T));
  return { sceneOpacity: 1 - he, handY: -190 * he, handScale: lerp(1, 0.42, he) };
}

/** Ground/background fade-in shared by every variant (0 → 0.4s easeOut). */
export const groundOpacity = (t: number): number => eo(seg(t, 0, 0.4));

// --------------------------------------------------------------------- per-variant evaluators
export interface WordmarkFrame {
  nameOpacity: number;
  nameTranslateY: number;
  /** letter-spacing in em (name tracking animates 0.5→0.3 on some variants; NaN = fixed). */
  nameTracking: number;
  ruleOpacity: number;
  ruleScaleX: number;
  tagOpacity: number;
  tagTranslateY: number;
}

const FIXED_TRACKING = 0.3;

function wordmark(
  t: number,
  windows: {
    name: [number, number];
    ruleO: [number, number];
    ruleS: [number, number];
    tag: [number, number];
  },
  trackFrom = FIXED_TRACKING,
): WordmarkFrame {
  const w = seg(t, windows.name[0], windows.name[1]);
  const woe = eo(w);
  const tg = seg(t, windows.tag[0], windows.tag[1]);
  const tge = eo(tg);
  return {
    nameOpacity: woe,
    nameTranslateY: lerp(8, 0, woe),
    nameTracking: lerp(trackFrom, FIXED_TRACKING, woe),
    ruleOpacity: seg(t, windows.ruleO[0], windows.ruleO[1]),
    ruleScaleX: eio(seg(t, windows.ruleS[0], windows.ruleS[1])),
    tagOpacity: tge,
    tagTranslateY: lerp(6, 0, tge),
  };
}

// ---- silk (T = 2.2 s) — the calm default; ribbons + emblem + sheen -------------------------
export interface SilkRibbonFrame {
  translateX: number; // percent
  opacity: number;
}

/** mkRibbon(start, fromX, toX, peak, phase): eased slide + continuous sine drift + envelope. */
export function silkRibbon(
  t: number,
  start: number,
  fromX: number,
  toX: number,
  peak: number,
  phase: number,
): SilkRibbonFrame {
  const rp = seg(t, start, start + 0.9);
  const x = lerp(fromX, toX, eio(rp)) + 1.6 * Math.sin(t * 1.4 + phase);
  const o = Math.min(1, rp * 4) * (0.16 + (peak - 0.16) * Math.sin(Math.min(rp, 1) * Math.PI));
  return { translateX: x, opacity: o };
}

export interface EmblemFrame {
  opacity: number;
  translateY: number;
  scale: number;
  blur: number;
}

export function silkFrame(t: number): {
  ground: number;
  bloomOpacity: number;
  ribbonA: SilkRibbonFrame;
  ribbonB: SilkRibbonFrame;
  ribbonC: SilkRibbonFrame;
  emblem: EmblemFrame;
  sheenTranslateX: number;
  sheenOpacity: number;
  wordmark: WordmarkFrame;
  handOff: HandOff;
} {
  const T = NATIVE_DURATION_S.silk;
  const e = seg(t, 0.7, 1.3);
  const eoe = eo(e);
  const sh = seg(t, 0.85, 1.3);
  return {
    ground: groundOpacity(t),
    bloomOpacity: 0.8 * eo(seg(t, 0.3, 1.0)),
    ribbonA: silkRibbon(t, 0.15, -26, 14, 0.5, 0),
    ribbonB: silkRibbon(t, 0.3, 24, -12, 0.85, 2.1),
    ribbonC: silkRibbon(t, 0.45, -20, 10, 0.4, 4.2),
    emblem: {
      opacity: eoe,
      translateY: lerp(10, 0, eoe),
      scale: lerp(0.96, 1, eoe),
      blur: lerp(6, 0, eoe),
    },
    sheenTranslateX: lerp(-120, 220, eio(sh)),
    sheenOpacity: sh > 0 && sh < 1 ? Math.sin(sh * Math.PI) * 0.6 : 0,
    wordmark: wordmark(
      t,
      { name: [1.15, 1.6], ruleO: [1.4, 1.55], ruleS: [1.4, 1.75], tag: [1.55, 1.9] },
      0.5,
    ),
    handOff: handOff(t, T),
  };
}

// ---- portal (T = 2.4 s) — aperture ring + masked emblem reveal ------------------------------
export function portalFrame(t: number): {
  ground: number;
  bloomOpacity: number;
  bloomScale: number;
  ringScale: number;
  ringOpacity: number;
  frameScale: number;
  frameOpacity: number;
  emblemOpacity: number;
  emblemClip: number; // clip circle radius %
  emblemBlur: number;
  emblemScale: number;
  wordmark: WordmarkFrame;
  handOff: HandOff;
} {
  const T = NATIVE_DURATION_S.portal;
  const bo = eo(seg(t, 0.2, 0.7));
  const ap = expo(seg(t, 0.4, 1.0));
  const em = eio(seg(t, 0.6, 1.2));
  return {
    ground: groundOpacity(t),
    bloomOpacity: bo,
    bloomScale: lerp(0.35, 1, bo),
    ringScale: lerp(0.55, 1, ap),
    ringOpacity: 0.9 * Math.min(1, seg(t, 0.4, 0.8) * 2),
    frameScale: lerp(1.0, 1.22, eo(seg(t, 0.9, 1.3))),
    frameOpacity: 0.25 * Math.min(1, seg(t, 0.9, 1.15) * 3),
    emblemOpacity: Math.min(1, seg(t, 0.6, 0.9) * 1.5),
    emblemClip: lerp(0, 75, em),
    emblemBlur: lerp(4, 0, em),
    emblemScale: lerp(1.05, 1, em),
    wordmark: wordmark(
      t,
      { name: [1.2, 1.65], ruleO: [1.5, 1.65], ruleS: [1.5, 1.85], tag: [1.6, 2.0] },
      0.5,
    ),
    handOff: handOff(t, T),
  };
}

// ---- collection (T = 2.4 s) — three cards drop into a fan -----------------------------------
export interface CardFrame {
  translateYPct: number; // percent of card height
  rotate: number; // degrees
  opacity: number;
}

export function collectionCard(
  t: number,
  start: number,
  rotFrom: number,
  rotTo: number,
): CardFrame {
  const cp = seg(t, start, start + 0.55);
  return {
    translateYPct: lerp(-230, 0, eio(cp)),
    rotate: lerp(rotFrom, rotTo, back(cp)),
    opacity: Math.min(1, seg(t, start, start + 0.2) * 1.4),
  };
}

export function collectionFrame(t: number): {
  ground: number;
  bloomOpacity: number;
  card1: CardFrame;
  card2: CardFrame;
  card3: CardFrame;
  /** Stack recede during hand-off: translateY −8% · scale 0.92 at full hand-off. */
  stackRecedeY: number;
  stackScale: number;
  wordmark: WordmarkFrame;
  handOff: HandOff;
} {
  const T = NATIVE_DURATION_S.collection;
  const ho = handOff(t, T);
  const he = 1 - ho.sceneOpacity; // eio-eased hand-off progress
  return {
    ground: groundOpacity(t),
    bloomOpacity: eo(seg(t, 0.1, 0.6)),
    card1: collectionCard(t, 0.0, -15, -8),
    card2: collectionCard(t, 0.15, 11, 4),
    card3: collectionCard(t, 0.3, -3, -1),
    stackRecedeY: -8 * he,
    stackScale: 1 - 0.08 * he,
    wordmark: wordmark(t, {
      name: [1.0, 1.45],
      ruleO: [1.25, 1.4],
      ruleS: [1.25, 1.55],
      tag: [1.4, 1.8],
    }),
    handOff: ho,
  };
}

// ---- journey (T = 2.6 s) — terrain + path of light + arrival --------------------------------
/** The journey bézier (14,196)→ctrl(70,164)→(50,108) evaluated exactly as the studio does. */
export function journeyBezier(s: number): { x: number; y: number } {
  const u = 1 - s;
  return {
    x: u * u * 14 + 2 * u * s * 70 + s * s * 50,
    y: u * u * 196 + 2 * u * s * 164 + s * s * 108,
  };
}

/** Path length from a 32-sample polyline (matches the prototype's precomputation). */
export function journeyPathLength(): number {
  let length = 0;
  let prev = journeyBezier(0);
  for (let i = 1; i <= 32; i++) {
    const pt = journeyBezier(i / 32);
    length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
    prev = pt;
  }
  return length;
}

export function journeyFrame(t: number): {
  ground: number;
  sunriseOpacity: number;
  sunriseScale: number;
  terrainBack: { opacity: number; driftX: number; translateY: number };
  terrainFront: { opacity: number; driftX: number; translateY: number };
  pathDashProgress: number; // 0..1 of L drawn
  pathOpacity: number;
  traveler: { x: number; y: number; opacity: number };
  arrivalRing: { scale: number; opacity: number };
  emblem: EmblemFrame;
  wordmark: WordmarkFrame;
  handOff: HandOff;
} {
  const T = NATIVE_DURATION_S.journey;
  const bo = eo(seg(t, 0.1, 0.7));
  const tb = eo(seg(t, 0.2, 0.9));
  const tf = eo(seg(t, 0.35, 1.05));
  const js = eio(seg(t, 0.5, 1.45));
  const pathFade = (1 - eo(seg(t, 1.5, 1.9))) * Math.min(1, seg(t, 0.5, 0.7) * 2);
  const dot = journeyBezier(js);
  const ap = seg(t, 1.35, 1.75);
  const e = seg(t, 1.35, 1.85);
  const eoe = eo(e);
  return {
    ground: eo(seg(t, 0, 0.45)),
    sunriseOpacity: 0.9 * bo,
    sunriseScale: lerp(0.7, 1, bo),
    terrainBack: { opacity: 0.92 * tb, driftX: 1.2 * Math.sin(t * 0.9), translateY: (1 - tb) * 10 },
    terrainFront: {
      opacity: tf,
      driftX: -1.5 * Math.sin(t * 0.8 + 1),
      translateY: (1 - tf) * 14,
    },
    pathDashProgress: js,
    pathOpacity: 0.85 * pathFade,
    traveler: {
      x: dot.x,
      y: dot.y,
      opacity: Math.min(1, seg(t, 0.55, 0.7) * 2) * (1 - seg(t, 1.38, 1.55)),
    },
    arrivalRing: {
      scale: lerp(0.3, 1.6, eo(ap)),
      opacity: Math.min(1, ap * 5) * (1 - ap) * 0.6,
    },
    emblem: {
      opacity: eoe,
      translateY: 0,
      scale: lerp(0.6, 1, eoe),
      blur: lerp(5, 0, eoe),
    },
    wordmark: wordmark(
      t,
      { name: [1.7, 2.1], ruleO: [1.9, 2.05], ruleS: [1.9, 2.2], tag: [2.0, 2.3] },
      0.5,
    ),
    handOff: handOff(t, T),
  };
}
