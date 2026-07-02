# Handoff: White-Label Casino Loyalty & Resort — Splash Screen System

## Overview

A CMS-driven splash-screen system for a React Native white-label loyalty & resort app serving hundreds of casino brands. It is a **luxury hospitality** experience (Apple Wallet / Airbnb tone) — explicitly NOT gaming iconography (no chips, cards, dice, neon).

The system is **one React Native component with eight animation variants**. Each client (casino) picks their splash in the CMS with a single token, `animationVariant`, while their logo, name, colors, background and tagline flow through the **same fixed layout**. No per-client code, builds, or branches.

Variants:

| id           | Name            | Signature                                                    | Duration | Complexity  |
|--------------|-----------------|--------------------------------------------------------------|----------|-------------|
| `horizon`    | The Threshold   | A luminous horizon parts the dark; emblem rises through it   | 2.4s     | Easy–Medium |
| `portal`     | Luxury Portal   | An architectural aperture opens; the brand is revealed through it | 2.4s | Medium      |
| `journey`    | Destination Journey | Abstract land rises; a path of light travels to the horizon and becomes the brand | 2.6s | Medium |
| `silk`       | Silk Wave       | Ribbons of silk-light flow; the logo emerges from the current| 2.2s     | Medium      |
| `seal`       | The Seal        | Logo engraves stroke-by-stroke, fills to metal, takes a glint| 2.4s     | Medium (Lottie) |
| `golden`     | Golden Hour     | Warm breathing light + time-aware personal greeting          | 2.4s     | Easy        |
| `collection` | The Collection  | Loyalty-tier cards drop into a fanned stack                  | 2.4s     | Medium      |
| `pulse`      | Concierge Pulse | Radial bloom, emblem spring, two expanding ring pings        | 2.2s     | Easy        |

`horizon` is the flagship/default and has the deepest spec (see the two "The Threshold" files).

## About the Design Files

The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and motion, not production code to copy directly. Your task is to **recreate these designs in the target React Native codebase** using its established patterns (react-native-reanimated, lottie-react-native, react-native-linear-gradient or expo-linear-gradient). If the RN project doesn't exist yet, scaffold with the team's standard (Expo or bare RN) and implement there.

Open any `.dc.html` file directly in a browser (keep `support.js` in the same folder). The pages are interactive:

- **Splash Variant Studio.dc.html** — THE primary reference. Variant picker + a scrubber that freezes the exact interpolated state at any time `t`. Every frame card lists the property values and timing windows. The math in `SplashScreen.dc.html` (the `progress != null` branch) is the authoritative interpolation spec — port it to a Reanimated worklet 1:1.
- **The Threshold - Splash Spec.dc.html** — layout anatomy, safe areas, spacing, light/dark, brand-color adaptation, four brand environment examples.
- **The Threshold - Motion.dc.html** — deep motion spec for the flagship variant (easing curves, spring config, principles, shared-element hand-off diagram).
- **SplashScreen.dc.html** — the component itself; its logic class contains all five variants' interpolation functions.
- **Splash Concepts.dc.html** — the original 5-concept exploration (context only).

## Fidelity

**High-fidelity.** Colors, typography, spacing, timing windows, easing and interpolation values are final and should be recreated precisely. The only intentionally-placeholder elements are: the compass-star emblem (stands in for each client's CMS logo), the brand names (MERIDIAN/AXIS/AZURE/SUMMIT), and the demo color themes.

## Screen Layout (shared by ALL variants)

Reference device 390 × 844 dp. All sizes below in dp; in the prototypes they are implemented as container-relative units (cqw ≈ % of screen width) so the layout scales to any device.

- **Safe areas**: top 44 (status bar — never draw content here), sides 24, bottom 34 (home indicator). All splash content lives in the center band; nothing is bottom-pinned.
- **Background**: full-bleed 2-stop vertical gradient, 178°, `backgroundValue[0]` → `backgroundValue[1]` (stop at 72%). Base/fallback color = `backgroundValue[1]`. A status scrim (top 16% of screen, black 42% → transparent in dark mode; white 28% → transparent in light mode) guarantees status-bar legibility.
- **Emblem (logo slot)**: 96 dp box (27% of screen width in prototype), horizontally centered, vertically centered at 50% H. Accepts SVG / PNG / Lottie of any aspect fitted inside the box. Golden Hour uses a smaller 72 dp box (20%).
- **Horizon seam** (`horizon` only): 2 dp tall line, inset 6% each side, at exactly 50% H. Fill: linear-gradient 90° — transparent → primary 22% → white 50% → primary 78% → transparent. Glow: `0 0 26dp 5dp primary@72%`.
- **Bloom**: radial-gradient ellipse in primary color; geometry varies per variant (see the studio) but is always `color-mix(primary, transparent)` — never a second hue.
- **Wordmark block**: column centered at 60% H (62% for `collection`), internal gap ≈ 21 dp: casino name, accent rule, tagline.
  - **Casino name**: Marcellus (serif), ~28 dp (7% width), letter-spacing +0.30em, single line, auto-shrink 28→20 dp to fit width − 48 dp. Color: cream `#F3ECDD` (dark) / ink `#2C2118` (light).
  - **Accent rule**: 54 dp × 1 dp, primary color, scaleX from center.
  - **Tagline** (optional): Manrope ~11 dp (2.7% width), uppercase, letter-spacing +0.34em, primary color. Empty tagline → element skipped, beats reflow.
- **Greeting block** (`golden` only, replaces wordmark block): at 57% H — "Good evening," Manrope ~17 dp in muted warm (`#B9AE98` dark / `#6E5C48` light), then member name in Marcellus ~37 dp (9.5% width) in the text color.
- **Card stack** (`collection` only): 3 cards, 60% × 38% of screen width (credit-card ratio), radius 4% width, centered at 40% H, final rotations −8° / +4° / −1° (top). Card fills are `color-mix` of primary into dark inks (bottom two) and into platinum `#ECEDF1→#C7CBD6` (top). Top card carries a small emblem (top-left), tier label bottom-left (2.2% width, +0.24em, bold), card number bottom-right in Marcellus.
- **Rings** (`pulse` only): 1 dp primary-color circles, 34% width diameter, centered on the emblem.

## Interactions & Behavior — the five timelines

All variants: single master clock `t` (seconds). Every element reads a window `[start, end]` off that clock with its own easing. **Animate only opacity / transform / blur** — no layout properties. The final 200 ms of every variant is the shared **hand-off**: scene opacity 1→0 (easeInOut) while the emblem interpolates toward the Home header slot (scale 1→0.42, translateY 0→−190 in prototype units; in production, interpolate to the measured header position).

Easing definitions:
- `easeOut` = easeOutCubic = `Easing.out(Easing.cubic)` = cubic-bezier(0.33, 1, 0.68, 1)
- `easeInOut` = easeInOutCubic = `Easing.inOut(Easing.cubic)` = cubic-bezier(0.65, 0, 0.35, 1)
- `easeOutExpo` = `Easing.out(Easing.exp)` = cubic-bezier(0.16, 1, 0.3, 1)
- `spring` = `withSpring({ damping: 14, stiffness: 120, mass: 0.9 })` — ≤2% overshoot (prototype approximates with easeOutBack, overshoot 1.3)

### horizon — The Threshold (T = 2.4s)
| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.40 | ground | opacity 0→1 | easeOut |
| 0.25–0.70 | bloom | opacity 0→1, scale 0.90→1.00 | easeOut |
| 0.32–0.62 / 0.35–0.75 | horizon seam | opacity 0→1 / scaleX 0.40→1.00 | easeOut / easeOutExpo |
| 0.65–1.15 | emblem (HERO) | translateY +14→0, scale 0.92→1.00, blur 8→0, opacity 0→1 | spring |
| 0.95–1.32 | glint | band translateX −150%→320% (skew −12°), opacity 0→.85→0 (sine) | linear |
| 1.20–1.65 | name | opacity 0→1, translateY 8→0, tracking 0.62em→0.30em | easeOut |
| 1.55–1.90 | accent rule | scaleX 0→1 | easeInOut |
| 1.65–2.05 | tagline | opacity 0→1, translateY 6→0 | easeOut |
| 2.20–2.40 | hand-off | scene fade + emblem→header | easeInOut |

### seal — The Seal (T = 2.4s)
| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.40 | ground | opacity 0→1; centered glow (primary@34%) 0.15–0.70 | easeOut |
| 0.05–0.95 | ring | stroke draw, dashoffset 346→0 | easeInOut |
| 0.25–1.05 | mark (HERO) | stroke draw, dashoffset 350→0 — production: Lottie stroke-draw of the client logo | easeInOut |
| 0.95–1.30 | fill | fill opacity 0→1 (strokes fill to solid metal) | easeOut |
| 1.10–1.45 | glint | as horizon | linear |
| 1.35–1.80 | name | opacity 0→1, translateY 10→0 | easeOut |
| 1.55–1.90 / 1.60–2.00 | rule / tagline | scaleX 0→1 / opacity 0→1, y 6→0 | easeInOut / easeOut |
| 2.20–2.40 | hand-off | scene fade + emblem→header | easeInOut |

### golden — Golden Hour (T = 2.4s)
| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.40 | ground | opacity 0→1 | easeOut |
| 0.10–0.90 | bloom (HERO) | opacity 0→1, scale 0.92→1.00 plus ±2% sine breathing (freq ≈ 2.6 rad/s, continues while visible) | easeOut |
| 0.30–0.80 | emblem (72 dp) | translateY 12→0, blur 4→0, opacity 0→1 | easeOut |
| 0.80–1.25 | "Good evening," | opacity 0→1, translateY 8→0 — copy adapts to local time (morning/afternoon/evening) | easeOut |
| 1.10–1.60 | member name | opacity 0→1, translateY 10→0 | easeOut |
| 2.20–2.40 | hand-off | scene fade + emblem→header; greeting can morph into Home's header greeting | easeInOut |

### collection — The Collection (T = 2.4s)
| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.55 | card 1 | translateY −230%→0 (of card height), rotate −15°→−8°, opacity in over first 0.2s | easeInOut (landing: slight spring) |
| 0.15–0.70 | card 2 | same, rotate 11°→4° | easeInOut |
| 0.30–0.85 | card 3 / tier card (HERO) | same, rotate −3°→−1° | spring |
| 1.00–1.45 | name | opacity 0→1, translateY 8→0 | easeOut |
| 1.25–1.55 | accent rule | scaleX 0→1 | easeInOut |
| 1.40–1.80 | tier line | opacity 0→1 | easeOut |
| 2.20–2.40 | hand-off | scene fade; stack recedes (y −8%, scale 0.92); optionally top card is the shared element into the wallet | easeInOut |

### portal — Luxury Portal (T = 2.4s)
Entering a destination resort: a warm light beyond, a circular architectural opening, the brand revealed through it. Three concentric elements centered on the emblem: **interior light** (Ø 52% W radial, primary@44%→transparent), **aperture ring** (Ø 46% W, 1.5 dp hairline primary@85%, glow 0 0 18 primary@30% outside + @16% inset), **outer frame** (Ø 46% W → ×1.22, 1 dp hairline primary@45%, rests at 25%).

| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.40 | ground | opacity 0→1 | easeOut |
| 0.20–0.70 | interior light | scale 0.35→1.00, opacity 0→1 | easeOut |
| 0.40–1.00 | aperture ring (HERO) | scale 0.55→1.00, opacity 0→.90 | easeOutExpo |
| 0.60–1.20 | emblem | circular mask reveal: clip circle 0→75%, blur 4→0, scale 1.05→1.00 | easeInOut |
| 0.90–1.30 | outer frame | scale 1.00→1.22, opacity 0→.25 hold | easeOut |
| 1.20–1.65 | name | tracking .50→.30em, translateY 8→0, opacity 0→1 | easeOut |
| 1.50–1.85 / 1.60–2.00 | rule / tagline | scaleX 0→1 / opacity 0→1, y 6→0 | easeInOut / easeOut |
| 2.20–2.40 | hand-off | scene fade; ring + emblem shrink together to header (ring fades in flight) | easeInOut |

Portal implementation notes: rings = plain Views (borderRadius 50%, hairline border, static shadow glow — never an animated blur); reveal mask = `@react-native-masked-view/masked-view` animated circle or Skia clip; low-end fallback = opacity + scale 1.05→1.00 without mask. 4 animated layers total. Full spec: `Luxury Portal - Spec.dc.html`.

### journey — Destination Journey (T = 2.6s)
The story of arriving. Two abstract silhouette layers (the "land") + a hairline journey path + a traveling point of light + the emblem at the destination. The land's profile is a CMS token — `environmentTheme: coast | mountain | desert | skyline | forest` — each theme is just **two SVG path strings** (back + front, in a 100×216 canvas); new themes are CMS catalog entries, no app release. Terrain fills derive from primary (dark: 18%/10% into near-black; light: 30%/24% into warm sand) so the land always sits in the client's palette.

Journey path: quadratic bézier (14,196) → ctrl (70,164) → (50,108) — destination is the emblem center (50% H). Draw via animated strokeDashoffset (length precomputed from a 32-sample polyline); traveler = an 8 dp warm-white dot with glow `0 0 12 primary@80%`, positioned by evaluating the same bézier in the worklet.

| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.45 | ground | opacity 0→1; sunrise glow (ellipse at 72% H) scale 0.7→1, opacity 0→.9 over 0.10–0.70 | easeOut |
| 0.20–0.90 | terrain back | translateY 10→0 u, opacity 0→.92; continuous drift ±1.2u · sin(0.9t) | easeOut + sine |
| 0.35–1.05 | terrain front | translateY 14→0 u, opacity 0→1; drift −1.5u · sin(0.8t+1) | easeOut + sine |
| 0.50–1.45 | journey | path dashoffset L→0 + traveler along bézier | easeInOut |
| 1.35–1.75 | arrival pulse (HERO) | ring scale 0.3→1.6, opacity fast-in → 0; traveler fades 1.38–1.55 | easeOut |
| 1.35–1.85 | emblem | grows from the arrival point: scale 0.6→1.00, blur 5→0, opacity 0→1 | easeOut |
| 1.50–1.90 | path | opacity .85→0 — dissolves once its purpose is complete | easeOut |
| 1.70–2.10 | name | tracking .50→.30em, translateY 8→0, opacity 0→1 | easeOut |
| 1.90–2.20 / 2.00–2.30 | rule / tagline | scaleX 0→1 / opacity 0→1 | easeInOut / easeOut |
| 2.40–2.60 | hand-off | scene fade + emblem→header; land dissolves | easeInOut |

Journey implementation notes: terrain = two `react-native-svg` Paths (animate wrapper transform only, never path data); a11y — parallax ±1.5% at ≤0.15 Hz, decorative and unannounced; budget — 5 animated layers + 2 one-shots, transform/opacity/dashoffset only. Full spec: `Destination Journey - Spec.dc.html`.

### silk — Silk Wave (T = 2.2s, CMS `animationDuration` rescales linearly, clamp 1800–3000ms)
The calm variant: no springs. Three soft ribbon bands (190% W, border-radius 50%, pre-blurred ≈10, fill = transparent → primary@38% → warm-white 60% core → primary → transparent) at top 34%/45%/57% H, heights 13%/15%/11% W, fixed rotations −16°/−10°/−13°. Every ribbon also carries a continuous sine drift `x += 1.6 · sin(1.4t + φ)` (φ = 0 / 2.1 / 4.2) computed off the same clock — no second timer.

| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.40 | ground | opacity 0→1 | easeOut |
| 0.15–1.05 | ribbon A | translateX −26→14 %, opacity 0→peak .50→settle .16 (sine envelope) | easeInOut + sine drift |
| 0.30–1.20 | ribbon B (brightest) | translateX 24→−12 %, opacity peak .85→.16 — crosses the emblem | easeInOut + sine drift |
| 0.45–1.35 | ribbon C | translateX −20→10 %, opacity peak .40→.16 (capped so text never sits on a bright band) | easeInOut + sine drift |
| 0.70–1.30 | emblem (HERO) | emerges in ribbon B's wake: blur 6→0, translateY 10→0, scale 0.96→1.00, opacity 0→1 | easeOut (long, 600ms) |
| 0.85–1.30 | silk sheen | wide soft band (60% W, skew −14°) translateX −120→220 %, opacity 0→.60→0 | easeInOut |
| 1.15–1.60 | name | tracking .50→.30em, translateY 8→0, opacity 0→1 | easeOut |
| 1.40–1.75 | accent rule | scaleX 0→1 while ribbons settle to ambient .16 | easeInOut |
| 1.55–1.90 | tagline | opacity 0→1, translateY 6→0 | easeOut |
| 2.00–2.20 | hand-off | scene fade + emblem→header; ribbons dissolve | easeInOut |

Silk implementation notes: ribbons = `LinearGradient` bands with **pre-blurred assets** (runtime blur on 190%-wide layers won't hold 60fps on low-end Android); optional Lottie upgrade replaces the three bands with one full-screen curved-silk Lottie driven by the same progress clock; emblem blur = cross-fade of pre-blurred vs sharp logo copies (opacity-only). Full spec: `Silk Wave - Spec.dc.html`.

### pulse — Concierge Pulse (T = 2.2s)
| t | element | change | ease |
|---|---------|--------|------|
| 0.00–0.35 | ground | opacity 0→1 | easeOut |
| 0.10–0.50 | bloom | opacity 0→1, scale 0.40→1.00 | easeOut |
| 0.25–0.65 | emblem (HERO) | scale 0.60→1.00, opacity 0→1 | spring |
| 0.45–1.15 | ring 1 | scale 0.35→2.40, opacity ramps in fast then →0 (`min(1, p*6) * (1−p) * 0.65`) | easeOut |
| 0.70–1.40 | ring 2 | same, softer echo | easeOut |
| 1.05–1.45 | name | opacity 0→1, translateY 8→0 | easeOut |
| 1.25–1.60 / 1.35–1.70 | rule / tagline | scaleX 0→1 / opacity 0→1 | easeInOut / easeOut |
| 2.00–2.20 | hand-off | scene fade + emblem→header | easeInOut |

### Navigation & shared elements
- On timeline completion → navigate to Home. **Preload Home's data and assets during the splash** so the hand-off is seamless.
- Shared elements: emblem → Home header logo slot (all variants); ground gradient persists as Home's background (no hard cut); optional: horizon → header divider, greeting → Home greeting, top tier card → wallet card.
- The splash plays **once per cold start**. No loops, no replay.

## State Management

- `config` — the CMS splash payload (fetched at startup, cached; bundle a default so first launch is never blank).
- One `useSharedValue` clock `t: 0→1` via `withTiming(1, { duration: T*1000, easing: Easing.linear })`; per-element `useAnimatedStyle` worklets ease *within* their windows (this is exactly how the prototype computes styles — port the `seg/eo/eio/expo/back/lerp` helpers from `SplashScreen.dc.html`).
- `status: 'playing' | 'done'`; completion callback → `runOnJS(navigateHome)`.
- Greeting variant reads local time + member profile (`memberName`); if no profile, fall back to casino name wordmark (i.e., render `horizon` text block instead).
- `prefers-reduced-motion` (AccessibilityInfo) → skip all timelines; 300 ms cross-fade of the final frame, then navigate. One shared code path for all variants.
- Fallbacks: unknown/missing `animationVariant` → `horizon`. Failed Lottie fetch (seal) → static logo with horizon timing. Missing tagline → beat skipped.

## Design Tokens

**Colors (demo values — production comes from CMS):**
- Text cream (dark mode): `#F3ECDD` · Text ink (light mode): `#2C2118`
- Muted warm (greeting line): `#B9AE98` dark / `#6E5C48` light
- Demo primaries: champagne `#D8B979` (Luxury), violet `#8E93F5` (Urban), aqua `#5FD6C6` (Beach), platinum-blue `#B4CBEC` (Mountain), rose `#E8607D`
- Demo grounds: `#241626→#0A0710` (flagship), `#3A2413→#0C0705`, `#1C1E33→#08090F`, `#0F3C46→#05161B`, `#16283F→#070C14`, light `#F6EFE1→#E7D6BC`
- All glows/blooms/tints are `primary` at an opacity (color-mix) — never introduce a second hue.

**Typography:** Marcellus (display serif; casino name, member name, card number) + Manrope (everything else). Name +0.30em tracking; tagline +0.34em uppercase; tier label +0.24em.

**Spacing scale:** 4 · 8 · 12 · 16 · 24 · 32 · 48 dp. Emblem→name 32, name→rule 20, rule→tagline 20.

**Shadows:** flat by design — no text/emblem drop shadows. Depth only from: horizon glow `0 0 26 primary@72%`, blooms, and card stack shadow `0 3% 6% −2.4% rgba(0,0,0,.75)` (of screen width).

## CMS Contract

```json
{
  "casinoName":       "MERIDIAN",
  "tagline":          "GRAND RESORT & CLUB",
  "logo":             "https://cdn.example.com/<client>/logo.svg",
  "logoLottie":       "https://cdn.example.com/<client>/logo-draw.json",
  "primaryColor":     "#D8B979",
  "backgroundStyle":  "gradient",
  "backgroundValue":  ["#241626", "#0A0710"],
  "appearance":       "auto",
  "animationVariant": "horizon"
}
```

- `logo`: transparent SVG/PNG, fitted to the 96 dp emblem box. `logoLottie` optional; required only for best-quality `seal`.
- `backgroundStyle`: `gradient | image | video` — swaps the ground layer only; choreography unchanged. For image/video, apply a black 30% scrim for text contrast.
- `appearance`: `auto | light | dark` — flips text colors + scrim direction; geometry unchanged.
- `animationVariant`: `horizon | journey | portal | silk | seal | golden | collection | pulse`.
- `environmentTheme` (journey only): `coast | mountain | desert | skyline | forest` — selects the silhouette pair; unknown → `coast`. Themes are data (two path strings each); extend the catalog in the CMS without code.
- `animationDuration` (optional, ms): scales the chosen variant's master clock linearly — every window keeps its proportion. Clamp 1800–3000 ms. Expose in the CMS as a **visual picker** (variant thumbnails), optionally tiered by plan.
- Validate colors for contrast at ingest (name text vs ground ≥ 4.5:1; auto-lighten/darken primary if needed).

## Performance Requirements

- 60 fps on low-end Android: all animation on the UI thread via Reanimated worklets; transform/opacity only; the blur effect is on the small emblem only (use `react-native-blur`-free approach: animate a pre-blurred copy's opacity, or Skia if already in the stack).
- No particle systems, no 3D, no full-screen blurs.
- Total added JS ≈ one component + 5 timeline presets. Lottie only loaded for `seal`.

## Assets

- Compass-star emblem (placeholder logo): inline SVG in `SplashScreen.dc.html` — viewBox 0 0 120 120, ring r=55 stroke-width 2 @ 42% opacity, 4-point star path `M60 8 L70.5 49.5 L112 60 L70.5 70.5 L60 112 L49.5 70.5 L8 60 L49.5 49.5 Z`. Replace with the client's CMS logo in production.
- Fonts: Marcellus + Manrope (+ JetBrains Mono, spec pages only) via Google Fonts. Bundle Marcellus/Manrope (or the brand-approved equivalents) in the app.
- No raster images.

## Files

| File | What it is |
|------|------------|
| `Splash Variant Studio.dc.html` | Interactive studio: all 8 variants, scrubber, frame-by-frame values, live CMS JSON |
| `Destination Journey - Spec.dc.html` | Full Destination Journey spec: concept, environment themes, motion, white-label behavior, CMS, a11y, RN notes |
| `Luxury Portal - Spec.dc.html` | Full Luxury Portal spec: concept, geometry, timeline, branding variations, CMS, a11y, RN notes |
| `Silk Wave - Spec.dc.html` | Full Silk Wave spec: concept, rationale, timeline, curves, CMS, accessibility, RN notes |
| `SplashScreen.dc.html` | The splash component; logic class = authoritative interpolation math for all variants |
| `The Threshold - Splash Spec.dc.html` | Layout spec: anatomy, safe areas, light/dark, brand adaptation, 4 brand worlds |
| `The Threshold - Motion.dc.html` | Flagship motion deep-dive: easing, spring, principles, shared-element hand-off |
| `Splash Concepts.dc.html` | Original 5-concept exploration (context) |
| `support.js` | Runtime for the prototypes — keep alongside the HTML files; not for production |
