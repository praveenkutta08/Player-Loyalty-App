# Handoff: Enterprise White-Label Casino CMS Portal

## Overview
A production-grade, multi-tenant CMS portal for managing a white-label casino mobile
platform. Two audiences use it: **Platform Admins** (internal staff managing hundreds of
casino properties from one console) and **Casino Admins** (property staff managing a single
casino). The portal spans dashboards, casino management, a drag-and-drop homepage builder,
promotions, rewards, hotel/dining/entertainment operations, media, notifications, theming,
users/roles, feature flags, localization, audit/publishing, and settings.

## About the Design Files
The files in this bundle are **design references created in HTML** — high-fidelity
prototypes that show the intended look, layout, and behavior. **They are not production code
to copy directly.** The `.dc.html` files use a lightweight in-house streaming/rendering
runtime (`support.js`); treat them purely as a visual + interaction spec.

Your task is to **recreate these designs in the target codebase's existing environment**
(React, Vue, Angular, Svelte, etc.) using its established component library, styling
approach, routing, and state patterns. If no front-end environment exists yet, choose the
most appropriate modern framework (React + TypeScript + a headless component lib such as
Radix/shadcn is a reasonable default for an enterprise SaaS admin of this complexity) and
implement there.

To view the prototype: open `Casino CMS Portal.dc.html` in a browser (it needs `support.js`
in the same folder, which is included). Use the **Platform / Casino** toggle and the
**light/dark** button in the top bar, and the sidebar to move between modules.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are all
specified below and present in the prototype. Recreate the UI faithfully using the
codebase's existing primitives — match the visual system (tokens below), not necessarily the
exact DOM structure.

---

## Design System / Tokens

The app is themed with CSS custom properties on a root element carrying `data-theme="dark"`
or `data-theme="light"`. Every surface/color below is a token — wire these into your
theme system rather than hardcoding.

### Color tokens

| Token | Dark | Light | Usage |
|---|---|---|---|
| `--bg` | `#0e0f13` | `#f5f4f0` | app base / topbar |
| `--bg2` | `#0a0b0e` | `#fbfaf7` | sidebar |
| `--content` | `#0e0f13` | `#f2f1ec` | main content area |
| `--panel` | `#16181d` | `#ffffff` | cards / panels |
| `--panel2` | `#1b1e23` | `#faf9f5` | nested surfaces / avatars |
| `--input` | `#101216` | `#ffffff` | inputs, tinted cells |
| `--border` | `#23262d` | `#e5e2da` | card + control borders |
| `--border-soft` | `#1b1e24` | `#edeae2` | row dividers |
| `--text` | `#f2f3f5` | `#1a1c20` | primary text |
| `--text2` | `#c7ccd3` | `#454a52` | secondary text |
| `--muted` | `#8b929c` | `#767c85` | tertiary / labels |
| `--faint` | `#5c636e` | `#a3a8b0` | hints, meta, section kickers |
| `--gold` | `#E6B450` | `#9a6c15` | accent for icons/text (darkened in light for contrast) |
| `--gold-fill` | `#E6B450` | `#E6B450` | solid gold (buttons, toggles) — always with `#1a1408` text on top |
| `--gold-bright` | `#ffd680` | `#c9992f` | gradient highlight |
| `--gold-dim` | `rgba(230,180,80,.12)` | `rgba(230,180,80,.16)` | gold tint backgrounds/pills |
| `--gold-border` | `rgba(230,180,80,.30)` | `rgba(180,130,40,.35)` | gold hairline borders |
| `--nav-active-bg` | `rgba(230,180,80,.10)` | `rgba(230,180,80,.18)` | active nav item bg |
| `--green` | `#5cc48f` | `#1f9d5f` | success / live status |
| `--red` | `#e5736b` | `#d64d43` | error / destructive |
| `--blue` | `#6aa6e8` | `#2f74c8` | info accent |
| `--purple` | `#b08ae0` | `#7c4fd0` | secondary accent |
| `--green/red/blue/purple-dim` | `rgba(...,.14)` | `rgba(...,.12)` | matching tint bg for pills |
| `--track-empty` | `#22252b` | `#e9e6de` | off toggle track / empty progress |
| `--card-shadow` | `0 1px 0 rgba(255,255,255,.02)` | `0 1px 2px rgba(20,22,28,.05), 0 1px 3px rgba(20,22,28,.05)` | card elevation |

Note the deliberate light-mode adjustment: `--gold` (used for icons/text) darkens to
`#9a6c15` for AA contrast on light backgrounds, while `--gold-fill` (solid buttons/toggles)
stays `#E6B450`. Gold buttons and active toggles always use dark ink `#1a1408` for the label
or knob.

### Typography
- **Display** (headings, hero numbers, big metrics): **Bodoni Moda** (serif), weight 400–600.
  Used for page `h1`s, KPI values, and section titles in luxury contexts. Gives the "casino
  luxe" character. Loaded via Google Fonts (`opsz` optical sizing 6–96).
- **Body / UI** (everything else): **Manrope**, weights 400/500/600/700/800.
- **Mono** (IDs, metrics, timestamps, ⌘K, codes, percentages): **JetBrains Mono**, 400–600.

Representative sizes: page `h1` 26–32px Bodoni; KPI numbers 34px Bodoni; card titles 14–15px
Manrope 700; body 12.5–13.5px; labels 11–12px; table headers 11px uppercase
`letter-spacing:.05em`; kickers 10–11px uppercase `letter-spacing:.16em`.

### Spacing, radius, shadow
- **Radius:** cards 14–16px, controls/inputs 8–10px, pills 20px, nav items 9px, phone bezel
  28–34px, avatars 50%.
- **Card padding:** 16–22px. **Grid/flex gaps:** 12–18px. **Content padding:** 26px 30px.
- **Sidebar** 250px fixed; **topbar** 64px; content max-width 1500px centered.
- Cards use `border: 1px solid var(--border)` + `box-shadow: var(--card-shadow)`. Premium
  cards get `border-top: 2–3px solid <accent>`.

### Status pill pattern
Inline-flex, `gap:5px`, `font-size:11.5px`, `font-weight:600`, `padding:3px 9px`,
`border-radius:20px`, colored text on matching `-dim` background, with a leading 6px dot in
the same color. Type tags use the same colors but `border-radius:6px` (rectangular).

### Toggle switch pattern
Track `34–40px × 19–22px`, `border-radius:20px`. On = `var(--gold-fill)` with knob pushed
right and knob color `#1a1408`; off = `var(--track-empty)` with knob left, knob color
`var(--faint)`. Knob is a `15–18px` circle inset 2px.

---

## App Shell (persistent chrome)

**Sidebar (250px, `--bg2`):** brand lockup (gold gradient spade mark + "CasinoOps" +
role kicker), a tenant switcher card (buildings icon + name + subtext + up/down caret), then
grouped nav (uppercase group labels in `--faint`; items = icon + label + optional mono badge
+ active dot). Active item: `--nav-active-bg`, `--text`, gold icon, trailing gold dot.
Inactive: transparent, `--muted`. Bottom: Settings link + user cell (avatar initials, name,
role, sign-out icon).

**Topbar (64px, `--bg`):** breadcrumb (`root / ViewTitle`), a search field (magnifier +
placeholder + ⌘K chip), then right cluster: **role segmented control** (Platform | Casino),
**theme toggle** (moon/sun), notification bell (red dot), and a solid gold **Create** button.

**Icons:** [Phosphor Icons](https://phosphoricons.com) (`ph` regular + `ph-fill`). Every
`<i class="ph ph-*">`/`ph-fill` maps to a Phosphor glyph — swap for your icon library
(names are semantic: `squares-four`, `buildings`, `ticket`, `crown`, `bed`, `fork-knife`,
`confetti`, `translate`, `clock-counter-clockwise`, `palette`, `toggle-right`, etc.).

---

## Screens / Views

All views render in the content area; the sidebar switches between them. Two roles change
the nav set and some content (see State Management).

### 1. Dashboard (role-aware)
- **Purpose:** at-a-glance health of the platform (or single casino).
- **Layout:** greeting header (kicker + Bodoni "Good evening, {name}" + subtitle + date-range
  pill) → 4-col KPI row → 2fr/1fr row (App Sessions area chart + System Health/User Activity)
  → 3-col row (Approval Queue, Recent Changes, Feature Flags + Scheduled Next).
- **KPIs:** Active Casinos/Members (gold top-border card), Publishes Today, Scheduled,
  Awaiting You (gold-gradient card). Values differ by role.
- **Chart:** SVG area sparkline, gold stroke + gold→transparent gradient fill, end dot; mono
  MON–SUN axis.
- **System Health:** 4 rows, colored status dot + label + mono % (green/gold/red).

### 2. Casino Management (Platform only) — 3 sub-views via segmented tabs
- **Directory:** filter bar (search, Region, Status, count, funnel) + data table. Columns:
  Property (logo chip + name + mono ID), Location, Status pill, Members (mono), Rev·MTD (mono
  bold), App version (mono), ⋯. 8 sample rows. Row click → Property Detail.
- **Property Detail:** header (56px gradient monogram + name + Live pill + meta row + Publish
  History / Edit buttons) → 4 stat cards → 2-col (Feature Configuration toggles + Publishing
  History timeline with colored nodes).
- **Creation Wizard:** 240px stepper column (5 steps: Property Basics, Branding, Features,
  Theme, Review & Launch — completed=green check, active=gold number, upcoming=outlined) +
  step content pane. Working Back/Continue advance the step; step 5 button reads "Launch
  Casino". Each step has distinct content (form fields / uploads + color chips / feature
  toggle grid / theme preset + phone preview / review summary + ready banner).

### 3. Homepage Builder (drag-and-drop)
- **Purpose:** compose the casino mobile home screen from reusable widgets.
- **Layout:** header (title + Draft vN badge + device toggle + Preview / Save Draft / Publish)
  → 3-col: **widget palette** (230px, 2-col grid of draggable widget tiles), **phone canvas**
  (300px bezel with notch + stacked widget blocks), **properties panel** (260px).
- **Widgets:** Hero Banner, Carousel, Promotions, Loyalty Card, Events, Dining, Hotel, Video,
  News, Quick Actions, Personalized, Recommends.
- **Canvas blocks** render distinct previews (Hero = ruby→gold gradient; Carousel = tiles;
  Loyalty = tier card; Quick Actions = 3 icon tiles; others = generic labeled block). Each has
  a gold drag-handle label chip; selected block has a 2px gold border + red ✕ remove button.
- **Properties panel:** title reflects selected block; fields for Headline, Linked promotion,
  Background color swatches, Auto-schedule toggle, Duplicate/Remove actions.

### 4. Navigation Builder
- Reorderable list of mobile nav items (drag handle + icon tile + label + mono deep-link +
  edit + enable toggle; disabled rows dimmed) beside a phone preview of the bottom tab bar.

### 5. Promotions — 3 sub-views
- **List:** segmented List/Calendar toggle + search + Type filter, then table (Promotion +
  casino/audience, Type tag, Status pill, Schedule, Redeemed mono, ⋯). Row → Detail.
- **Calendar:** month grid (July 2026), Sun–Sat headers, out-of-month days dimmed, today
  highlighted gold, event chips per day (colored by type; some days have 2).
- **Detail:** back link, 1.6fr/1fr layout — left: type/status header + title + description +
  hero gradient preview + Performance stats; right: Audience Targeting + Schedule cards.

### 6. Rewards
- 5-tier ladder cards (Bronze→Diamond) each with tier-colored top border + crown, points
  threshold (mono), member % (Bodoni), benefits. Below: Points Earning Rules + Active Bonus
  Campaigns (icon tile + name + scope + Live pill).

### 7. Hotel
- Room-type cards (gradient image area + availability chip + name + occupancy + Bodoni rate/
  night). Below: Amenities grid + Digital Room Keys card (enabled pill + active-keys stat).

### 8. Dining
- Restaurants table (icon + name, cuisine, mono hours, reservations, status). Below: Today's
  Specials & Happy Hours — 3 cards with colored left borders.

### 9. Entertainment
- 2-col event cards: date tile (mono) + type tag + name + venue + ticket-status (color-coded:
  gold=selling, green=available, red=sold out).

### 10. Analytics
- 4 KPI cards (Active Users, Avg Session, Redemptions, Retention; up/down deltas) → 2fr/1fr
  (Daily Active Users dual-line SVG: solid gold this month + dashed faint last month; Revenue
  by Channel conic-gradient donut with legend) → 2-col (Top Promotions horizontal bars; Push
  Performance funnel bars Sent/Opened/Tapped/Redeemed).

### 11. Media Library
- 190px folder rail (active folder + storage meter) + asset grid (4-col cards: gradient
  thumb + type badge IMG/VID/PDF/SVG + name + size + usage). Toolbar: search, type/tags
  filters, grid/list toggle.

### 12. Theme Management
- 1fr/340px: left controls (Brand Colors swatches, Typography, Navigation Style radio cards,
  Assets upload tiles) + right **sticky live mobile preview** rendering the themed app home.

### 13. Users & Roles
- 1fr/260px: user table (avatar initials + name/email, Role tag, Scope, Status dot, Last
  login, ⋯) + side panel (Roles list with counts + a role's permission checklist ✓/✗). Roles:
  Platform Admin, Casino Admin, Marketing Manager, Operations, Hotel Manager, Rewards Manager,
  Finance, Support, Read Only.

### 14. Notifications
- 1fr/300px: campaign table (name/timing, Channel tag Push/In-App/Email/SMS, Audience, Sent
  mono, Open-rate mono) + composer preview (styled push notification card + A/B test results).

### 15. Feature Flags
- Rows: name (+ optional BETA/EU/INTERNAL bordered tag) + description, Scope, Rollout %
  (green when on), and a toggle. 6 sample flags.

### 16. Localization
- 1fr/300px: languages table (flag + name, mono code, keys progress "n / total", progress bar
  + %) + Regional Formats card (currency, timezone, date format, first day, number format).

### 17. Audit & Publishing
- Publishing pipeline (Draft → In Review → Approved → Published, each a colored node with
  count) + Audit Log (icon + "who action object" + mono timestamp + rollback icon).

### 18. Settings
- Integrations grid (4-col: icon + status pill + name + category; Stripe, Agilysys PMS, Micros
  POS, IGT Gaming, Comarch Loyalty, Twilio, Mapbox, Okta SSO) + 1.4fr/1fr (API Keys with masked
  mono values + copy; Security & Auth toggles: SSO, MFA, IP allowlist, session timeout).

---

## Interactions & Behavior
- **Sidebar nav:** click switches the active view (client-side; map to routes such as
  `/dashboard`, `/casinos`, `/homepage`, `/promotions`, …). Active item gets `--nav-active-bg`
  + gold icon + trailing dot.
- **Role switch (Platform | Casino):** segmented control in topbar. Switching swaps the nav
  set, tenant name/subtext, user identity, breadcrumb root, search scope, and role-specific
  dashboard KPIs; it resets the active view to Dashboard.
- **Theme toggle:** flips `data-theme` between `dark`/`light`; all colors are token-driven so
  the whole app recolors instantly. Icon toggles moon↔sun.
- **Casino sub-tabs** (Directory/Property Detail/Creation Wizard) and **Promotions sub-tabs**
  (List/Calendar) are segmented controls with a gold active segment; row clicks open detail.
- **Creation Wizard:** Back/Continue mutate a `wizStep` (1–5), clamped; step 5 confirms and
  returns to Directory. Stepper reflects done/active/upcoming.
- **Homepage Builder drag-and-drop (real HTML5 DnD):**
  - Palette tiles are `draggable`; `dragstart` stores the widget **type**. Dropping on the
    canvas **appends** a block of that type and selects it.
  - Canvas blocks are `draggable`; `dragstart` stores the **from index**, `dragover`
    `preventDefault()`, `drop` **reorders** (splice from→to) and selects the moved block.
  - Selected block: 2px gold border + ✕ remove (stopPropagation so remove doesn't re-select).
  - Clicking a block selects it and updates the properties panel title.
- **Hover:** palette tiles brighten to gold border + `--gold-dim` bg on hover; rows and nav
  items are pointer-cursor and should get a subtle hover surface.
- No animations are required; keep transitions subtle (≤150ms) on hover/toggle. (Avoid CSS
  entrance animations with `fill-mode: both` on view mounts — they caused invisible-until-
  animated capture issues in the prototype.)

## State Management
Central UI state needed:
- `theme`: `'dark' | 'light'` (persist to localStorage; respect `prefers-color-scheme` on
  first load).
- `role`: `'platform' | 'casino'` → derives nav set, tenant, user, KPI values.
- `view`: active module id (route).
- `casinoView`: `'list' | 'detail' | 'wizard'`; `wizStep`: 1–5.
- `promoView`: `'list' | 'calendar' | 'detail'`.
- Homepage builder: `hpBlocks: string[]` (ordered block types) + `hpSel: number` (selected
  index); transient drag refs for from-index and new-type.
- Data fetching: in a real build, replace the sample arrays (casinos, promotions, tiers,
  rooms, restaurants, events, users, flags, languages, integrations, audit log, media assets)
  with API calls. Everything is tenant-scoped — Casino Admin requests must be isolated to
  their property; Platform Admin can query across all.

## Assets
- **Fonts:** Google Fonts — Manrope, Bodoni Moda (with optical sizing), JetBrains Mono. Self-
  host in production.
- **Icons:** Phosphor Icons (regular + fill). Substitute your icon set using the semantic
  names in the markup.
- **Imagery:** all "photos" are CSS gradients (placeholders). Replace with real casino/brand
  imagery and the tenant's uploaded logos, app icons, and splash screens.
- No raster image files are shipped in this bundle.

## Files
- `Casino CMS Portal.dc.html` — the full portal prototype (all 18 views, both themes, both
  roles, wizard, drag-and-drop). **Primary reference.**
- `Casino CMS (aesthetic explorations).dc.html` — the three early Dashboard aesthetic
  directions (Obsidian / Vault / Salon). The shipped portal is a hybrid; keep for context on
  the visual rationale.
- `support.js` — prototype runtime (needed only to open the `.dc.html` files in a browser;
  **not** for production use).
