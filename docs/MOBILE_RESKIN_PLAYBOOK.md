# Mobile Re-skin Playbook — "Obsidian Luxury Companion"

Elevate the mobile app to the sample design in
`design/screens/stitch_luxe_casino_resort_mobile_companion/`. This is a **visual re-skin only** — it
does NOT change the IA, the modules, or any backend. Copy-paste the prompts into Claude Code in order.

## Non-negotiable guardrails (state these in every prompt)
- **Keep Option B IA exactly.** The mockups show an old 5-tab bar (Home · Gaming · Wallet · Resort ·
  Messages). IGNORE that. Our nav stays **Home · Offers · center Scan/Play · Account · More** with the
  Offers segmented control (For You | Offers | Promotions | My Rewards) and support/AI under More.
  Re-skin the *look* of the tab bar (floating glass pill), not its structure.
- **Everything stays manifest/token-driven.** No hardcoded hex in components. This obsidian look is the
  new **default theme** (the `demo-casino` tenant); tenants still override via the manifest. Put all
  values in the theme tokens, not in screens.
- **Dark is the default scheme.** Force the default/demo theme to dark obsidian; keep the light palette
  working but stop the app from silently following the emulator's light mode for the demo tenant.
- Don't touch money/auth/RLS logic. Visual layers only: theme tokens, typography, shared UI components,
  per-screen layout/styling, imagery, nav chrome.

---

## The design system (from `obsidian_luxury_companion/DESIGN.md` + the PNG renders)

**Aesthetic:** obsidian glassmorphism + editorial minimalism. Full-bleed architectural photography as
the anchor, high-contrast serif display, ultra-fine "ghost" borders instead of drop shadows, generous
whitespace, a floating glass tab bar.

**Color (dark default):**
- Obsidian void `#050505` (base), surface `#121414`, elevated slate `#1A1A1C`/`#1e2020`,
  container-high `#282a2b`.
- Text: primary pearl `#E2E2E2`, secondary silver `#A1A1A6`/`#c4c7c7`, muted `#8e9192`.
- **Accent = Indigo `#5E5CE6`** (primary actions, active states, credit amounts, "electric pulse").
  Champagne gold `#E6B450` demotes to a secondary/tier accent only.
- Amounts: credit/positive = indigo `#5E5CE6`; debit/negative = soft red `#ffb4ab`.
- Borders: 0.5px "ghost" pearl at ~15–20% opacity (`border-primary/15`), not shadows.

**Typography:**
- **Display = Playfair Display** (serif) — screen titles, names, venue titles, big balance. Weights
  600/700, tight tracking (-0.01 to -0.02em). (Bodoni Moda is an acceptable fallback if Playfair
  licensing is a concern — but the spec calls for Playfair.)
- **UI = Inter** — body, labels, buttons, nav. UPPERCASE tracked micro-labels (`label-caps`, 12px,
  +0.1em) and a `utility-mono` style (Inter 13px, tight tracking) for currency/IDs/timestamps.

**Shape & depth:**
- Cards/containers radius **16px**; immersive image cards & bottom sheets **24px**; wallet member card
  **12px**; buttons & inputs **16px**; nav pill & chips **full**.
- Depth via **glass**: backdrop blur 20–40px over `#1A1A1C` at 60–80% opacity + a 0.5px pearl ghost
  border on top/left edges. No heavy drop shadows.

**Spacing:** 24px safe margins (mandatory), 16px gutters, vertical rhythm 8 / 16 / 32 / 64; 64px+ gaps
between major sections.

**Signature components:**
- **Immersive card:** full-bleed photo + gradient scrim + Playfair title bottom-left + a `CATEGORY`
  caps kicker + pill CTAs (primary pearl/indigo solid, secondary glass w/ 1px pearl border).
- **Floating glass tab bar:** a detached rounded-full island, 16px off the screen bottom, backdrop
  blur, 0.5px pearl border; active tab is a filled pill.
- **Wallet member card:** metallic-grain slate card, tier name in Playfair, masked number in
  utility-mono, indigo chip highlight.
- **Utility list rows:** 0.5px hairlines that stop 24px from each edge (not full-bleed).

---

## Screen → mockup mapping

| Our Option B screen | Mockup folder |
| --- | --- |
| Login / Lock (biometric) | `welcome_biometric_login` |
| Home | `personalized_home_explorer` |
| Wallet (Scan/Play + cardless) | `digital_wallet_membership` |
| Offers → Promotions/Offers segments | `promotions_offers_feed` |
| Account → Tier & Rewards / My Rewards | `rewards_tier_status` |
| Games catalog | `gaming_slot_hub` |
| Reservations (rooms) | `hotel_suite_explorer` |
| Reservations (dining) | `dining_culinary_hub` |

Each folder has `screen.png` (visual target) and `code.html` (exact colors/blur/radii to lift).

---

# Prompts

### RS0 — Foundation: tokens, fonts, and the primitive UI kit (do first)
```
Re-skin foundation for the mobile app to the "Obsidian Luxury Companion" system in
design/screens/stitch_luxe_casino_resort_mobile_companion/ (read obsidian_luxury_companion/DESIGN.md and
the screen.png files). VISUAL ONLY — do not change navigation IA (keep Option B), modules, or backend.
Guardrails: all values live in theme tokens (no hardcoded hex in screens); this is the new DEFAULT theme
for the demo-casino tenant; tenants still override via manifest; dark obsidian is the default scheme.

1. Update design/tokens.json (dark default palette) to the obsidian system: base #050505, surface
   #121414, elevated #1A1A1C, text pearl #E2E2E2 / silver #A1A1A6 / muted #8e9192, primary accent indigo
   #5E5CE6, credit indigo / debit #ffb4ab, gold #E6B450 demoted to a secondary/tier accent, 0.5px ghost
   borders (pearl @15-20%). Keep the light palette but ensure the demo tenant defaults to dark. Radii:
   card 16, image/sheet 24, wallet 12, control 16, pill full. Run pnpm gen:tokens so mobile TS + admin
   CSS regenerate; keep them in sync (pnpm check:tokens).
2. Typography: switch display to Playfair Display and UI to Inter (fallbacks Bodoni Moda / system).
   Bundle the TTFs in apps/mobile/assets/fonts, wire react-native.config.js, and run
   `npx react-native-asset`. Define text roles display / headline / title / body / label-caps (uppercase,
   +0.1em) / utility-mono (currency/IDs, tight tracking) in the theme and expose a <Text>/Typography
   helper that applies fontFamily so screens never set it inline.
3. Build/upgrade the shared UI kit in apps/mobile/src/components to the glass system: GlassCard (backdrop
   blur over #1A1A1C 60-80% + 0.5px pearl top/left ghost border, radius 16), ImmersiveCard (full-bleed
   image + scrim + Playfair title bottom-left + caps kicker + CTA row), PillButton (primary solid
   pearl/indigo, secondary glass w/ 1px pearl border, radius 16), Kicker/CapsLabel, HairlineRow (0.5px,
   inset 24px), and a FloatingTabBar chrome (detached rounded-full glass island 16px off bottom, active =
   filled pill). Use react-native blur (e.g. @react-native-community/blur) if not present — add it behind
   a small wrapper in src/native so it can be mocked in tests.
Acceptance: tokens regenerate + check:tokens passes; fonts render (Playfair on titles, Inter on body);
the UI kit renders in isolation. Commit: feat(mobile): obsidian luxury theme tokens + fonts + glass UI kit (RS0).
```

### RS1 — Login / Lock (biometric)
```
Re-skin the mobile Login + Lock/biometric screens to design/screens/.../welcome_biometric_login/screen.png
using the RS0 kit. Full-bleed resort-lobby photo with a dark scrim; "EXECUTIVE COMPANION" caps kicker;
Playfair "Welcome back, <name>" (mixed roman + italic like the mockup); a centered glowing biometric orb
labeled BIOMETRIC ACTIVE; a floating glass action sheet at the bottom with a pearl "IDENTIFY TO ENTER"
pill and "USE PASSCODE" / "HELP" caps links; an "OBSIDIAN LUXURY" footer rule. Keep the existing auth
logic, OTP/passcode flows, and A2/A3/A6 routes unchanged. Imagery comes from the manifest (fallback to a
bundled default). Commit: feat(mobile): re-skin login/lock to obsidian luxury (RS1).
```

### RS2 — Home
```
Re-skin the Home screen to design/screens/.../personalized_home_explorer/screen.png with the RS0 kit,
keeping our content and the global concierge "Ask" entry. Top bar: avatar + "EXECUTIVE COMPANION" (use
the tenant name) + points pill. Full-bleed hero image with Playfair "Good Morning, <name>" + a subtitle
kicker. A "CONTINUE YOUR VISIT" glass card with a progress bar + resume pill. "AI RECOMMENDATIONS ·
VIEW ALL" section rendered as stacked ImmersiveCards (category kicker, Playfair title, CTA) — driven by
the existing concierge for-you data, not hardcoded. Footer stat strip (VISIT DURATION / CURRENT TIER).
Keep the concierge "some context unavailable" and RG-safe copy behavior intact. Do NOT change the tab bar
structure — only its glass styling. Commit: feat(mobile): re-skin home to obsidian luxury (RS2).
```

### RS3 — Wallet (Scan/Play + cardless)
```
Re-skin the Wallet screen(s) to design/screens/.../digital_wallet_membership/screen.png. A metallic-grain
DIGITAL MEMBER CARD (radius 12) showing tier in Playfair + masked number in utility-mono + indigo chip.
"CURRENT BALANCE" caps label + large Playfair balance + "AVAILABLE CREDIT" in indigo. A 3-up glass action
row (Deposit / Withdraw / Rewards). "RECENT TRANSACTIONS · VIEW ALL" as HairlineRow list: icon chip,
name + timestamp (utility-mono), amount (credit indigo / debit #ffb4ab) + status caps. Keep the cardless
"Pair to play — Find nearby machines / Scan QR" surface (our center Scan/Play tab) restyled as glass with
an indigo primary. All money values/idempotency logic unchanged. Commit: feat(mobile): re-skin wallet +
member card to obsidian luxury (RS3).
```

### RS4 — Offers (For You / Offers / Promotions / My Rewards)
```
Re-skin the Offers tab to design/screens/.../promotions_offers_feed/screen.png, KEEPING our segmented
control (For You | Offers | Promotions | My Rewards) at top — restyle the segments as caps pills, don't
replace them with the mockup's nav. "CURATED OFFERS" Playfair header + "EXCLUSIVE ACCESS · <season>"
kicker. Each offer = an ImmersiveCard: full-bleed image, category kicker (LIMITED TIME / LOYALTY REWARD /
ONYX EXCLUSIVE), Playfair title, and CLAIM (solid) + VIEW DETAILS (glass) pills. Data + claim/idempotency
flows unchanged. Commit: feat(mobile): re-skin offers feed to obsidian luxury (RS4).
```

### RS5 — Account: Tier progress, benefits, rewards marketplace
```
Re-skin the tier/rewards surfaces (under Account, incl. My Rewards) to
design/screens/.../rewards_tier_status/screen.png. A large circular progress ring (tier %, points in
Playfair, "X points until <next tier>"). "<TIER> BENEFITS · LEVEL N" as glass rows with icon chips +
chevrons (HairlineRow style). "MARKETPLACE · VIEW ALL" as a horizontal rail of ImmersiveCards (item photo,
CURATED kicker, name, points cost). Keep the redemption + points logic and the Responsible Gaming /
Verification (KYC) rows intact and correctly gated. Commit: feat(mobile): re-skin tier + rewards
marketplace to obsidian luxury (RS5).
```

### RS6 — Games, Reservations (rooms + dining)
```
Re-skin the Games catalog and Reservations (rooms + dining) screens to
design/screens/.../gaming_slot_hub, hotel_suite_explorer, and dining_culinary_hub/screen.png using the
ImmersiveCard pattern (full-bleed photography, Playfair titles, category kickers, glass CTAs) and 64px
section gaps between lifestyle categories. Keep search/filter/leaderboard and reservation flows unchanged.
Commit: feat(mobile): re-skin games + reservations to obsidian luxury (RS6).
```

### RS7 — Global chrome + polish pass
```
Final pass: restyle the floating glass tab bar (Home · Offers · center Scan/Play · Account · More — Option
B unchanged) as a detached rounded-full glass island 16px off the bottom with an indigo active pill;
restyle headers, empty/error/loading states, toasts, and the More menu to the obsidian system; ensure
StatusBar is light-content on obsidian; add the crisp light-haptic on primary taps; verify no screen sets
a hardcoded color (grep) and everything reads from tokens. Update the splash variants to match. Run the
mobile test suite + typecheck. Commit: feat(mobile): obsidian luxury chrome + polish (RS7).
```

---

## After the re-skin
- Set the emulator to any mode — the demo tenant now forces dark obsidian, so the look is stable.
- Update `design/DESIGN_NOTES.md` to reference this obsidian system as the current default (supersedes
  the earlier "Executive Companion" note) so it doesn't drift again.
- Confirm the mockups now live in `design/screens/` (they do) so future builds have the visual source.
```
