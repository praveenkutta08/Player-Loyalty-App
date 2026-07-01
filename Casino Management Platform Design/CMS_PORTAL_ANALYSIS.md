# CMS Portal — Design Analysis & Reconciled Screen List

Analysis of the `design_handoff_casino_cms` bundle (18-view, multi-tenant CMS, two roles,
light+dark, luxury dark+gold). Verdict: **strong and well-aligned** with our plan — it validates
the unified-admin + RBAC + adapter approach and adds several capabilities we hadn't specced. It is
also **missing a few screens our requirements need** (notably geofencing). Below: alignment,
coverage map, gaps to add, what to adopt, and a reconciled final screen list mapped to build prompts.

---

## 1. Design-system alignment (good)
- **Roles:** "Platform Admin" vs "Casino Admin" = our **super-admin vs tenant-admin**; the topbar
  Platform|Casino switch = our tenant-context switch. Add our **scoped super-admin (Account
  Manager)** as a third case.
- **Tokens:** luxury dark+gold with **full light + dark** themes; gold `#E6B450`; **Bodoni Moda**
  (display serif) / **Manrope** (UI) / **JetBrains Mono**. This matches our "Obsidian" mobile
  direction. *Reconcile:* unify the gold (`#E6B450` here vs `#C6A662` in our `tokens.json`), adopt
  **Bodoni Moda** as the shared display font, and add a **light mode** to the mobile tokens (or keep
  the CMS dual-theme and mobile dark-default). Wire tokens; don't hardcode.
- **Settings → Integrations map to our adapter ports**, which is a nice validation:
  IGT Gaming → Casino Management System (CMP); Agilysys PMS → reservations/hotel; Comarch Loyalty →
  LoyaltyPort; Stripe → PaymentPort; Twilio → push/SMS; Okta → SSO; Mapbox → geofencing map.

## 2. Coverage map — the 18 design views vs our plan
| # | Design view | Maps to | Status | Notes |
|---|-------------|---------|--------|-------|
| 1 | Dashboard (role-aware) | — | **Adopt (new)** | Landing KPIs/approvals; we hadn't specced a dashboard |
| 2 | Casino Mgmt (Directory / Detail / Creation Wizard) | P3.3 | **Edit** | Richer than ours — adopt the 5-step create wizard + property detail + publish history |
| 3 | Homepage Builder (drag-drop) | P3.5 (content) | **Adopt (new)** | Visual mobile-home composer; ties to manifest Home modules |
| 4 | Navigation Builder | manifest `navigation` | **Adopt (new)** | This IS the admin UI for our Option B config-driven nav |
| 5 | Promotions (List / Calendar / Detail) | P3.6 | **Edit** | Add the calendar view; also author **Offers** here (we split Offers vs Promotions) |
| 6 | Rewards (tiers / points / campaigns) | P3.10 | **Edit** | Design = tier ladder + points rules; **add the Rewards Marketplace item catalog** |
| 7 | Hotel (rooms / amenities / room keys) | P3.9 | **Keep** | Includes digital-room-key config |
| 8 | Dining (restaurants / specials) | P3.9 | **Keep** | |
| 9 | Entertainment (events / tickets) | P3.9 | **Keep** | New content category (events) |
| 10 | Analytics | P3.9 | **Keep** | Richer dashboards |
| 11 | Media Library (DAM) | P3.5 | **Adopt (new)** | Dedicated asset manager |
| 12 | Theme Management | P3.4 | **Keep** | Matches branding studio; add nav-style + light/dark |
| 13 | Users & Roles (9 roles + permission checklist) | P3.3 | **Keep** | Maps to our Permissions Matrix (Appendix C) |
| 14 | Notifications | P3.7 | **Edit** | Multi-channel Push/In-App/Email/SMS + A/B — richer than our push-only |
| 15 | Feature Flags | P3.3 | **Edit** | Promote to a dedicated screen |
| 16 | Localization | — | **Adopt (new)** | Languages + regional formats (admin side of our i18n) |
| 17 | Audit & Publishing (Draft→Review→Approved→Published) | P3.9 | **Edit** | Adopt the **approval/publishing workflow**, not just an audit log |
| 18 | Settings & Integrations + API keys + security | P3.3 | **Edit** | Integrations = adapter credentials; add API keys + SSO/MFA/IP settings |

## 3. Gaps — screens our requirements need that the design is MISSING
| Screen to add | Why | Prompt |
|---|---|---|
| **Geofencing / Location Campaigns** | Core requirement (enter-zone / 10-min dwell → offer). Absent from the handoff. Map-based zone + beacon + trigger editor. | P3.8 (exists) |
| **Support Assistant config** | Our support-only AI chat: per-tenant FAQ/knowledge, guardrails, escalation routing. | P3.11 (exists) |
| **Players / Members (CRM)** | A casino CMS needs a player 360: search, loyalty, wallet, KYC status, comps, support history — **PII-gated** by role. Design only has admin Users. | **New** P3.15 |
| **Compliance & Responsible Gaming** | KYC provider config, RG limits/self-exclusion list, geolocation/jurisdiction rules. Essential for gaming. | **New** P3.16 |
| **Valet** | Design covers Hotel/Dining/Entertainment but not valet ops (config + request queue). | P3.9 (extend) |
| **Payments & Cashless oversight** | Cashless enable/limits + wallet transactions/reconciliation view. | **New** P3.18 |
| **Games catalog curation** | Mobile has a Gaming tab; CMS needs featured/jackpot-of-the-day + leaderboard config. | P3.10 (extend) |

## 4. Adopt from the design (beyond our earlier plan)
Dashboard (role-aware) · Homepage Builder (drag-drop) · Navigation Builder (our config-driven nav
UI) · Media Library · Localization · Audit **& Publishing** approval workflow · dedicated Feature
Flags screen · Settings/Integrations mapped to adapter ports. All are worth taking.

## 5. Reconciled final CMS IA (grouped)
- **Overview:** Dashboard
- **Casinos (Platform):** Directory · Property Detail · Creation Wizard
- **Experience:** Homepage Builder · Navigation Builder · Content · Media Library · Theme · Localization
- **Engagement:** Promotions & Offers · Rewards (tiers + marketplace) · Games · Notifications ·
  **Geofencing / Location Campaigns** · **Support Assistant**
- **Operations:** Hotel · Dining · Entertainment · **Valet** · Reservations queue
- **Players:** **Members (CRM)** · **Compliance & Responsible Gaming**
- **Money:** **Payments & Cashless**
- **Platform:** Users & Roles · Feature Flags · Audit & Publishing · Settings & Integrations · Analytics

## 6. Mapping to the build (playbook P3.x)
- **Keep/edit existing:** P3.1 shell (+light/dark, Phosphor icons, Bodoni/Manrope), P3.3 (add
  directory/detail/creation-wizard, feature-flags screen), P3.4 (theme + nav-style), P3.6 (add
  calendar + offers), P3.7 (multi-channel + A/B), P3.9 (hotel/dining/entertainment/valet + analytics
  + audit→publishing), P3.10 (tiers + points + marketplace + games), P3.8 geofencing, P3.11 support.
- **New prompts to add:** P3.12 Homepage & Navigation builders (drag-drop, manifest-driven) ·
  P3.13 Media Library · P3.14 Localization · P3.15 Players/Members CRM (PII-gated) ·
  P3.16 Compliance & Responsible Gaming · P3.17 Audit & Publishing pipeline ·
  P3.18 Settings/Integrations + API keys + security + cashless oversight · P3.19 Dashboard.

## 7. Decisions to confirm
1. **Homepage Builder + Navigation Builder** are powerful but sizeable — MVP now, or Phase-1.5?
   (Navigation Builder is high-value: it's the console for our Option B manifest nav.)
2. **Player CRM PII** — confirm which roles can view/export (ties to the Permissions Matrix).
3. **Token reconciliation** — unify gold to `#E6B450`, adopt Bodoni Moda display, add light mode to
   the mobile `tokens.json`? (Recommended for brand cohesion.)
4. **Offers vs Promotions** — the design lumps them; we split them (mobile Offers tab). Keep the
   split and author both under "Promotions & Offers".

## 8. Notes
- The `.dc.html` files are visual/interaction specs (custom `support.js` runtime) — recreate in our
  React + Vite + TS + RTK + TanStack + Tailwind stack using the tokens above; the design's Phosphor
  icons map to our Lucide set by semantic name.
- Open `Casino CMS Portal.dc.html` in a browser (with `support.js`) to view all 18 views, both
  themes, both roles, the wizard, and the drag-and-drop.


## 9. Decisions (confirmed)
1. **Homepage + Navigation builders: in the MVP.**
2. **Player-CRM PII (decided):** PII masked by default; **unmasking and export are gated to elevated roles and audited**; marketers/editors get segments only; wallet/transaction detail limited to admin/finance/support.
3. **Tokens unified:** gold `#E6B450`, **Bodoni Moda** display, **Manrope** UI, light+dark (mobile `tokens.json` updated).
4. **Offers and Promotions are SEPARATE screens** in the CMS.

All folded into the playbook: P3.1-P3.11 revised + P3.12-P3.19 added (screen IDs embedded; see design/CMS_SCREEN_INVENTORY.md).
