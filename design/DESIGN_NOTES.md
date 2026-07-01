# Design notes — Executive Companion (sample)

Derived from the sample screens. Aesthetic: **dark "obsidian" luxury** — near-black canvas,
warm off-white text, champagne-gold accent, high-contrast **serif display** paired with a clean
**sans** for UI/labels; uppercase micro-labels with wide letter-spacing; generously rounded cards
and full-pill CTAs. This is the **default** white-label theme; each tenant overrides it via the CMS.

## Palette (see tokens.json)
- Canvas `#0A0A0B`, cards `#141417`, elevated `#1C1C21`.
- Text `#F2EEE6` / secondary `#A9A49B` / muted `#6E6A63`.
- Primary CTA = ivory `#E7DFCD` pill with near-black text; gold accent `#E6B450` (tier ring, hairlines).
- Amounts: green `#5FB98C` (credit) / red `#D8564F` (debit).

## Type
- Display (serif, e.g. Bodoni Moda): screen titles, venue names, big balance.
- Sans (Manrope): body, buttons, and UPPERCASE tracked labels (11px, +0.14em).
- Confirm the exact Figma fonts; if licensed (Canela/GT Sectra/Söhne), swap `fontFamily.display`/`sans`.

## Screens -> build modules (playbook)
| Sample screen | Module / prompt |
|---|---|
| Identify to Enter (biometric + passcode) | Auth & enrolment (P4.3) + **biometric login (add)** |
| Good Morning + Continue visit + AI Recommendations + tier/duration | Home (P4.4) + loyalty tier (P4.5) |
| Digital Member Card + Balance + Deposit/Withdraw + Transactions | Wallet & cashless (P4.6) |
| Gaming: search, All/Slots/Tables, Jackpot, Favorite games, Leaderboard | **Games catalog + leaderboard (new module — see below)** |
| Resort: featured suite, dates/guests, recommended rooms, concierge | Reservations (P4.7) |
| Dining: Omakase, Reserve table, venue collections | Reservations/dining (P4.7) |
| Onyx Progress + Benefits + Marketplace (redeem points) | Loyalty/tier (P4.5) + **Rewards marketplace (new — see below)** |
| Curated Offers (Claim / View details) | Offers & promotions (P4.4) |
| Bottom nav: Home · Gaming · Wallet · Resort · Messages | App shell (P4.1) + **Messages/inbox (P4.9 push inbox)** |

## New modules this design implies (beyond the MVP list)
1. **Games catalog & leaderboard** — browse/search titles (slots/tables), jackpot feature,
   favorites, points leaderboard. (Distinct from cardless *play*; it's a content + ranking module.)
2. **Rewards marketplace** — redeem loyalty points for items/experiences (e.g. watch, jet, upgrade).
3. **Biometric login** (Face ID / fingerprint) on top of the auth module.
Folded into the playbook: P2.11-P2.12 (backend), P3.10 (admin authoring), P4.11-P4.13 (mobile).

## How this feeds the build
- `tokens.json` -> admin Tailwind theme + mobile theme, and it defines the **shape** of the tenant
  manifest (so tenants recolor/retype without code). Playbook P3.1 (admin) and P4.1/P4.2 (mobile).
- Keep token names stable across admin, mobile, and manifest.
