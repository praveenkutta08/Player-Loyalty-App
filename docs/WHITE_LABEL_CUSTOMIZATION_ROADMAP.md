# White-Label Customization Roadmap

> Added 2026-07-02. Companion to `PlayerApp_ClaudeCode_Build_Playbook.md` (Phase 7) and the
> analysis doc. This is the **full catalog** of CMS-driven appearance/behavior customization for
> the mobile app, with what ships in the MVP vs. what is phased. Everything here follows golden
> rule #5 (manifest-driven theming): tenants configure in the CMS Portal, publish bumps the
> manifest version, the app updates with **no rebuild and no app-store release**.

## 1. Principles (apply to every option below)

1. **Experience Packs are the primary mechanism.** A pack is a curated, QA'd bundle of all other
   choices. Individual options are *overrides within a pack*, validated against pack constraints.
   This prevents combinatorial explosion (untestable option matrices) and keeps every combination
   intentional.
2. **Every option is a versioned enum in the manifest schema** with a documented default. Writes
   reject unknown values; reads fall back gracefully (older app binaries never crash on a newer
   manifest).
3. **Options resolve to design tokens + component variants**, never per-option components
   (7 button styles = 1 `<Button>` with a `variant` prop).
4. **Accessibility guardrails are built in**: reduced-motion is always respected; the CMS validates
   contrast at save time (tokens.json already models this — gold darkens for AA in light mode);
   glass/blur styles ship as fixed presets, not free-form values (Android blur is a perf trap).
5. **Anything "AI" routes through the concierge guardrails** (deterministic scoring, LLM narrates
   only, RG flags → neutral treatment, consent, audit). No generative reordering of a gambling
   app's UI outside that envelope.
6. **CMS previews use real tenant values** (logo, colors, copy) in a phone frame — a named option
   without a preview is useless to an operator.
7. **RBAC + audit**: appearance changes are permission-gated (Appendix C) and write audit rows,
   like any publish.

## 2. MVP (Phase 7 — in the playbook)

| Surface | Ships | Variants | CMS config |
|---|---|---|---|
| **Splash** | P7.1–P7.3 | `journey` Destination Journey · `collection` The Collection · `portal` Luxury Portal · `silk` Silk Wave (4 of 8 in the design handoff; **`silk` = default/fallback**) | logo, background gradient [top,bottom], tagline, optional duration (rescales timeline, clamp 1.8–3s), environmentTheme (journey only: coast/mountain/desert/skyline/forest) |
| **Bottom nav style** | P7.1, P7.2, P7.4 | Floating Pill · Editorial (2 of 3) | style, active/inactive colors; elevation/radius/blur are fixed per-style presets |
| **Typography pairing** | P3.4 (constraint noted there) | 3–5 bundled display+UI pairings, e.g. Bodoni Moda+Manrope (tokens.json default), Marcellus+Manrope (splash handoff) + 1–2 modern/entertainment pairs — open-license only | `typography.pairing` enum picker (gallery); sizes/weights stay pack-driven tokens |

Splash designs: high-fidelity handoff in `design/splash/` (8 variants as one component family,
shared clock/layout/hand-off — which is why 4 in MVP is cheap; see its README). Deliberately cut
from MVP: `horizon` The Threshold (the handoff's flagship — our fallback is `silk` instead),
`golden` Golden Hour, `pulse` Concierge Pulse, `seal` The Seal (see §3.1); nav style *Adaptive*
(implies behavioral logic — different class of work). All are additive later: new enum value +
new component, zero CMS rework.
Open design item: `collection` logged-out/anonymous card state (interim rule in P7.3: generic
brand-monogram cards, no tier label, no card number; never a real card number on splash).

**Locked constraint:** nav styles are visual skins only. The Option B structure
(Home · Offers · center Scan/Play · Account · More), the center action's cashless-flag fallback,
and manifest-driven tabs (`IA_NAVIGATION_PLAN.md` §6) are unchanged in every style.

Also already in the MVP via existing prompts (not Phase 7): design tokens / branding studio
(P3.4), homepage widget composition + ordering via drag-drop Homepage Builder (P3.12 — palette:
Hero, Carousel, Promotions, Loyalty Card, Events, Dining, Hotel, Video, News, Quick Actions,
Personalized, Recommends), nav tab reorder/enable/relabel (P3.12), light/dark themes (P1.5/P4.2).

## 3. Phased backlog (the full option catalog)

Phasing: **A** = near-term (post-MVP polish, low risk) · **B** = later (needs design/QA
investment) · **C** = gated (compliance, perf, or architectural dependency).

### 3.1 Splash Experience — remaining variants (already designed in `design/splash/`)
Same props contract as P7.3; each is one new enum value + timeline. In suggested order:
- **`golden` Golden Hour (A)** — time-aware personal greeting; pairs with Greeting Styles (§3.12)
  and member personalization; needs the logged-out fallback (renders wordmark block).
- **`pulse` Concierge Pulse (A)** — natural pack default for concierge-enabled tenants (Phase 6
  tie-in: the pulse reads as the persona/orb waking up).
- **`horizon` The Threshold (A)** — the handoff's flagship with the deepest spec (dedicated
  Splash Spec + Motion files); add when a tenant/pack wants it.
- **`seal` The Seal (C — gated)** — requires a per-tenant Lottie stroke-draw of each client's
  logo: asset PRODUCTION work per casino, not just config. Defer until there's an asset pipeline
  (Media Library Lottie support + a production playbook) or real demand.
Add "Transition to Home" options beyond the built-in emblem→header hand-off when shared-element
navigation lands (see 3.9).

### 3.2 Navigation Experience — Adaptive (B)
Context-dependent bar behavior (e.g. collapse on scroll, contextual center action). Needs a real
behavioral spec + heavy QA across every screen. Keep as a third `navigation.style` enum value.

### 3.3 Home layouts (A→B)
Concierge, Editorial, Rewards First, Resort First, Promotions First. Implement as **named widget
presets** for the existing Homepage Builder (P3.12) — a layout is just a starting arrangement the
operator can then tweak, not a separate engine. Concierge layout depends on Phase 6.

### 3.4 Widget library expansion (A→B)
Builder + ordering exist (P3.12). Phase in: **A** — Tier Progress, Wallet Summary, Cashless
Balance, Digital Membership Card, Messages/Notifications, Property Map, Favorites, Recently
Viewed. **B** — visibility rules + scheduling per widget (rules engine + CMS UI), Recommended
Experiences (concierge-backed). Personalized ordering → 3.13.

### 3.5 Hero section (A→B)
**A**: static image + carousel with scheduling (content system already schedules, P3.5).
**B**: video and Lottie (asset pipeline: size caps, transcoding in Media Library, download-on-wifi
policy, battery/perf budget); editorial banner; gradient background (token-driven, cheap — can
ship in A).

### 3.6 Card styles (A)
Minimal, Glass, Luxury, Elevated, Soft, Rounded, Outlined → single `<Card variant=...>` driven by
tokens (radius/border/shadow/blur presets). Ship 3–4 curated variants first; Glass gets the same
Android-blur rule as the nav bar.

### 3.7 Button styles (A)
Rounded, Pill, Square, Outline, Filled, Glass, Gradient → `<Button variant=...>`. tokens.json
already models buttonPrimary/Secondary; this generalizes it. Ship 3–4 first.

### 3.8 Motion personality (B)
Elegant, Minimal, Luxury, Calm, Fast, Playful → a **motion token set** (duration/easing/spring
scales) consumed by all animated components, selected per pack. No free-form CMS
duration/easing fields — presets only. Haptics per-personality with an OS-respecting kill switch.

### 3.9 Screen transitions (B)
Fade, Slide, Scale ship as part of motion presets (**A-adjacent**). Shared Element, Morph, Lift,
Zoom are **B**: react-navigation shared-element work, per-screen wiring, heavy device QA.

### 3.10 Background styles (A→B)
Solid + Gradient (**A**, pure tokens). Aurora, Luxury Texture, Photography, Glass, Abstract,
Pattern (**B**: asset-backed, contrast validation against text tokens mandatory at CMS save time).

### 3.11 Icon packs (B)
Rounded, Outline, Filled, Duotone, Premium Line. Icon sets ship **in the binary** — every pack
inflates every tenant's app. Ship 2 packs max initially (current + one premium line); revisit only
with real demand.

### 3.12 Greeting styles (A)
Template strings with time-of-day + player-name interpolation, localizable, CMS-editable list per
tenant. Cheap and high-delight — good early candidate. VIP-tier variants gated by loyalty tier.

### 3.13 Personalization level (C — gated)
Minimal, Standard, Advanced, AI-Driven. **Minimal/Standard** = deterministic rules (tier, segment,
schedule) — fine as **A/B** work on top of the widget rules engine (3.4). **Advanced/AI-Driven** =
homepage ordering, promo targeting, and content visibility MUST route through the concierge
envelope (Phase 6): deterministic scoring, RG-flagged players get neutral ordering (no
gambling-incentive amplification), consent + audit, jurisdictional marketing rules. Never a
free-running model reordering a casino app.

### 3.14 Loyalty card styles (A)
Classic, Glass, Metal, Luxury, Gradient, Black Edition → variants of the Digital Member Card
component (P4.5), token-driven, optionally auto-selected by tier. Low risk, high perceived value.

### 3.15 Wallet experience (B/C)
Financial Dashboard, Luxury Wallet, Quick Actions, Card Stack. **Visual** variance = B. Anything
touching money flows stays on the one audited path (golden rule #4: append-only ledger,
idempotency) — layout may vary, transaction UX does not fork per tenant (C).

### 3.16 Offer presentation (A→B)
Cards, List, Grid, Carousel (**A** — layout modes of the existing offers surface). Editorial,
Stories (**B** — new interaction patterns, real design effort).

### 3.17 Promotion presentation (A→B)
Cards, Timeline (**A**). Posters, Stories, Editorial (**B**). Same component-variant rule.

### 3.18 Loading experience (A)
Skeleton + Shimmer (**A**, default). Pulse, Wave (**A**, trivial). Brand Animation (**B** —
Lottie pipeline shared with 3.5).

### 3.19 Empty states (A)
Minimal + Illustration (**A**). Photography, Lottie (**B**, asset pipeline). CMS-configurable copy
per empty state from day one (pairs with the ux-copy inventory).

### 3.20 Experience Packs (the umbrella — start at A, grow forever)
Luxury Resort, Modern Urban, Entertainment, VIP Elite, Resort Lifestyle. Each pack = a versioned
manifest bundle: token theme + splash variant + nav style + home layout preset + card/button
variants + motion preset + presentation defaults. **Ship 2–3 packs first** (suggest: Luxury
Resort ≈ current tokens.json default, Entertainment, Modern Urban); every new option above is
added *to packs*, then optionally exposed as an individual override. Packs are the QA unit: a
pack's combination is tested as a whole.

### 3.21 Custom per-tenant fonts (C — gated)
True brand fonts beyond the curated pairings. Requires: font licensing verification, a bundling
pipeline, and an app build + store release per new font (breaks the no-rebuild model — so this is
an enterprise-tier onboarding service, not CMS self-service). Until then, tenants pick from the
bundled pairing set (§2). Adding a new open-license pairing to the set = one binary release that
benefits all tenants.

## 4. What this means for the manifest (shape, not final schema)

```jsonc
"appearance": {
  "pack": "luxuryResort",            // umbrella; individual keys below override the pack
  "splash":    { "variant": "journey", "environmentTheme": "coast", "...": "..." },  // Phase 7
  "typography": { "pairing": "marcellusManrope" },   // curated bundled set only (P3.4 note, §3.21)
  "navigation": { "style": "floatingPill" },                  // Phase 7 (sibling of tabs)
  "components": { "card": "glass", "button": "pill", "loyaltyCard": "blackEdition" },
  "motion":    { "personality": "elegant" },
  "presentation": { "offers": "cards", "promotions": "timeline",
                    "loading": "shimmer", "emptyState": "illustration" },
  "personalization": { "level": "standard" }   // advanced/aiDriven gated by concierge guardrails
}
```
Every key: versioned enum, documented default, read-side fallback. Additive only — existing
`theme tokens`, `navigation.tabs`, `featureFlags` blocks are untouched.

## 5. Decision log

| Date | Decision |
|---|---|
| 2026-07-02 | Pack-first architecture adopted; options #1–19 are overrides within packs. |
| 2026-07-02 | MVP appearance variants = 3 splash + 2 nav styles, CMS-selected (playbook Phase 7). |
| 2026-07-02 | Adaptive nav, splash variants 4–5, free-form motion/blur/elevation fields: deferred. |
| 2026-07-02 | AI-driven personalization only via the Phase 6 concierge envelope (RG/consent/audit). |
| 2026-07-02 | Nav customization never alters Option B structure or the center-action fallback. |
| 2026-07-02 | Splash design handoff (8 variants, one component family) received → `design/splash/`. MVP = 4 variants: `journey`, `collection`, `portal`, `silk`; handoff IDs are the manifest enum; CMS names are display labels. |
| 2026-07-02 | Fallback/default splash = `silk` (overrides the handoff's `horizon` default — horizon not in MVP). |
| 2026-07-02 | `animationDurationMs` rescales each variant's native timeline linearly, clamp 1800–3000ms. |
| 2026-07-02 | `environmentTheme` (journey terrain) added to the manifest `splash` block; themes are CMS catalog entries (2 SVG paths each), no app release. |
| 2026-07-02 | `collection` privacy/state rule: never a real card number on splash; logged-out = anonymous brand cards (design drop pending). |
| 2026-07-02 | `seal` deferred (per-tenant Lottie logo production); `golden` + `pulse` + `horizon` = next adds (§3.1). |
| 2026-07-02 | Nav bar styles: no design file will be provided — Claude Code designs both styles in P7.4 from existing tokens + the splash handoff's visual language, with an approval gate before implementation. |
| 2026-07-02 | Fonts in MVP = curated bundled pairing set only (`typography.pairing` enum, open-license fonts); NO free-form font input or uploads. Custom per-tenant fonts = gated later phase (§3.21). Constraint noted on P3.4 in the playbook. |

## 6. Shipping a new tenant binary (H6 runbook)

Runtime branding is manifest-driven; a NEW tenant binary only needs a native identity shell.
The JS bundle is identical across tenants.

### Android (product flavor)
1. In `apps/mobile/android/app/build.gradle` ▸ `productFlavors`, copy the `auroraBay` block:
   set `applicationIdSuffix`, `resValue "string", "app_name"`, and the three
   `buildConfigField`s (`TENANT_ID` = tenant UUID from the console, `TENANT_SLUG`,
   `API_BASE_URL` = the tenant's API origin + `/api/v1`).
2. Add the two debug variants to `react { debuggableVariants = [...] }` (e.g. `"acmeDebug"`).
3. Optional per-tenant launcher icon/splash: `android/app/src/acme/res/…` (flavor source set).
4. Build: `cd apps/mobile/android && ./gradlew assembleAcmeRelease` (or `run-android --mode acmeDebug`).

JS reads these via the `TenantBuildConfig` native module
(`android/.../TenantBuildConfigModule.kt` → `src/config/buildConfig.ts`); blank fields fall
back to `apps/mobile/.env`, then the committed demo values, so the `demo` flavor stays the dev loop.

### iOS (scheme + xcconfig) — requires a Mac
1. Copy `ios/Config/AuroraBay.xcconfig` → `ios/Config/Acme.xcconfig`; fill `TENANT_ID`,
   `TENANT_SLUG`, `TENANT_API_BASE_URL`, `TENANT_APP_NAME`, `PRODUCT_BUNDLE_IDENTIFIER`.
2. In Xcode: add duplicate Debug/Release configurations based on the xcconfig, duplicate the
   `mobile` scheme as `mobile-Acme`, and set `CFBundleDisplayName = $(TENANT_APP_NAME)` plus
   `TenantId/TenantSlug/TenantApiBaseUrl = $(TENANT_ID)/$(TENANT_SLUG)/$(TENANT_API_BASE_URL)`
   in Info.plist.
3. Add `ios/mobile/TenantBuildConfig.swift` + `.m` to the target once (first tenant only) —
   they expose the Info.plist values to JS; until then iOS uses the `.env`/dev fallbacks.

### Fonts
Manifest typography tokens must name a font bundled in `assets/fonts/` (see
`assets/fonts/OFL-ATTRIBUTION.md`). The default pairing (Manrope / Bodoni Moda /
JetBrains Mono) ships in the repo and in `android/app/src/main/assets/fonts/`; per-tenant
additions go into the flavor source set (`android/app/src/<flavor>/assets/fonts/`) and the
Xcode target on iOS.
