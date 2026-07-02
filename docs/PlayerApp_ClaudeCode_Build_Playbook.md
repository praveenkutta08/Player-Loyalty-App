# Player Mobile App — Claude Code Build Playbook

A sequenced set of **copy-paste prompts** for Claude Code to build the white-label casino player
platform front-to-back and wire it together: **FastAPI backend + PostgreSQL**, a **unified React
admin console** (CMS + super-admin), and a **bare React Native** app — a **pnpm + Turborepo monorepo**.

This playbook pairs with the **starter scaffold** in `starter-scaffold/` (keep its `CLAUDE.md`
files) and the architecture reference `Casino_Player_App_MVP_Analysis.docx`.

---

## How to use this playbook

1. Create a git repo from `starter-scaffold/` (use it as the repo root). Keep all `CLAUDE.md` files.
2. Put your design file in `design/` (see *Attaching the design file* below).
3. Open the repo in Claude Code. It will auto-read the root `CLAUDE.md`.
4. Run the prompts **in order**, one at a time. Each prompt is self-contained but builds on the last.
5. After each prompt: run the **Acceptance** checks, run `lint + typecheck + test`, then **commit**.
6. Re-generate `packages/api-client` whenever the backend API changes (a Phase 2 prompt sets this up).

### Working tips
- **Use Plan mode** for the larger prompts (Phase 1.4 auth/RBAC, Phase 2.8 geofencing, Phase 3/4 apps):
  let Claude Code propose a plan, review it, then execute.
- **Let Claude Code run the tests it writes** and iterate until green before you commit.
- **One prompt = one focused change + its tests.** If it sprawls, stop and split it.
- **Keep CLAUDE.md authoritative.** If a decision changes, update CLAUDE.md so later prompts inherit it.
- The **golden rules** (RLS tenant isolation, server-side authz, adapter pattern, append-only money
  ledger, manifest-driven theming) are in the root `CLAUDE.md`. Every prompt assumes them.

### Prerequisites / tooling
- Node 20+, pnpm 9+, Python 3.12, `uv`, Docker, Xcode + Android Studio (for the mobile app).
- `docker compose up -d` (Postgres, Redis, MinIO, Mailhog) before backend prompts.

### Attaching the design file
When you reach the UI prompts (Phase 3.1 and 4.1), the design must already be in `design/`:
- **Figma:** put the URL in `design/FIGMA.md`; those prompts tell Claude Code to pull frames +
  variables via the Figma MCP and implement them as the design system + default tenant theme.
- **Exported:** `design/tokens.json` + `design/screens/*` + `design/logo/*`.
Token **names** must be shared across admin, mobile, and the tenant **manifest** schema.

### Prompt legend
Each prompt below is inside a fenced block you paste into Claude Code, followed by **Acceptance**
(how to know it's done) and a suggested **Commit** message.

---

# PHASE 0 — Foundations

### P0.0 — Environment preflight (install prerequisites)
```
Environment preflight — do this BEFORE any build prompt, and do NOT start building until it passes.

Detect my OS and architecture. Check each REQUIRED tool below is installed and meets the minimum
version. For anything missing or too old, INSTALL it with my OS package manager (winget or choco on
Windows, Homebrew on macOS, apt/dnf on Linux), then re-check the version. If you CANNOT install a
tool automatically (needs a GUI installer, a reboot, admin rights, or a license — e.g. Docker
Desktop, Android Studio, Xcode), STOP and print exact numbered manual install steps with official
download links, then wait for me to confirm. Never skip a tool, mock it, or work around a missing
dependency.

CORE (Phases 0-3 — backend, admin, infra):
- git
- Node.js >= 20 (enable Corepack)
- pnpm >= 9
- Python >= 3.12
- uv
- Docker + Docker Compose  (provides Postgres, Redis, MinIO, Mailhog — do NOT install those directly)

MOBILE (only needed at Phase 4 — report status now, install when we reach it):
- JDK 17
- Android Studio + Android SDK + an emulator (Android)
- macOS only: Xcode + CocoaPods + Watchman (iOS)
- React Native CLI
Note: iOS builds require macOS. If I am on Windows/Linux, say so and plan Android locally + a Mac/CI
for iOS.

Do this:
1. Print a table: tool | required | found | action taken | status (OK / installed / MANUAL NEEDED).
2. Install what you can (show the exact commands you run) and re-verify.
3. For each MANUAL NEEDED item, give numbered steps + the official link.
4. Start `docker compose up -d` (db, redis, minio, mailhog) and confirm the containers are healthy.
5. Only when all CORE tools are OK, print "Preflight passed — ready for P0.1" and STOP. Do not start P0.1.
```
**Acceptance:** all CORE tools report OK; docker services healthy; any MANUAL items listed with steps.
**Commit:** _(environment setup — no code commit)_

### P0.1 — Initialize the monorepo & tooling
```
Read CLAUDE.md. Set up this repo as a pnpm + Turborepo monorepo (do NOT build app features yet).
- Confirm workspaces: apps/backend, apps/admin, apps/mobile, packages/shared-types,
  packages/api-client, packages/config.
- In packages/config add shared base tsconfig, eslint (typescript + import order), and prettier
  configs, and have the JS/TS packages extend them.
- Wire root scripts through turbo (dev/build/lint/typecheck/test) per turbo.json.
- Verify docker-compose services (db, redis, minio, mailhog) start healthy.
Keep changes to config/scaffolding only.
```
**Acceptance:** `pnpm install` succeeds; `docker compose up -d` shows healthy db/redis; `pnpm -w typecheck` passes.
**Commit:** `chore: scaffold pnpm+turbo monorepo and shared config`

### P0.2 — Shared types & API-client codegen placeholder
```
Read CLAUDE.md. In packages/shared-types define the cross-cutting TS types we will reuse:
Role and Permission enums (mirror the Permissions Matrix in the analysis Appendix C), the
tenant Manifest shape (design tokens + featureFlags + endpoints + version), and common value
objects (Money as integer cents + currency, Paginated<T>, ProblemDetails).
In packages/api-client add an npm script `generate` using openapi-typescript to turn the backend
OpenAPI JSON into typed models, plus an RTK Query base API to be filled once the backend exists.
Stub exports so both apps can import now.
```
**Acceptance:** `pnpm --filter shared-types build` and `--filter api-client build` succeed; enums match Appendix C.
**Commit:** `feat: shared types + api-client codegen scaffold`

---

# PHASE 1 — Backend core (FastAPI)

### P1.1 — FastAPI skeleton, settings, errors, OpenAPI
```
Read CLAUDE.md and apps/backend/CLAUDE.md. Create the FastAPI service in apps/backend using uv.
- App factory in app/main.py; settings via pydantic-settings reading .env (see .env.example).
- /api/v1 router prefix; OpenAPI metadata + tags; CORS for the admin dev origin.
- Structured JSON logging; a global exception handler returning RFC 7807 problem+json.
- core/pagination.py (cursor pagination helper) and core/deps.py placeholders.
- GET /health. A pytest that asserts /health and that /api/v1/openapi.json is served.
No domain models yet.
```
**Acceptance:** `uv run uvicorn app.main:app --reload` serves `/health`; `uv run pytest` green.
**Commit:** `feat(backend): FastAPI skeleton, settings, RFC7807 errors, OpenAPI`

### P1.2 — Async DB layer + Alembic
```
Read apps/backend/CLAUDE.md. Add the async SQLAlchemy 2.0 layer (asyncpg) against docker Postgres.
- Engine + async session dependency (commit/rollback per request).
- Base model with UUID primary key and created_at/updated_at; a TenantOwned mixin adding
  tenant_id (UUID, NOT NULL, indexed).
- Configure Alembic for async; generate the initial migration.
Add a test that opens a session and round-trips a trivial row.
```
**Acceptance:** `uv run alembic upgrade head` applies on docker Postgres; DB test passes.
**Commit:** `feat(backend): async SQLAlchemy + Alembic base`

### P1.3 — Multi-tenancy with Postgres RLS
```
Read CLAUDE.md golden rule #1. Implement tenant isolation with Postgres Row-Level Security.
- tenants table (id, name, slug, status).
- A tenancy dependency that resolves the current tenant (from JWT later; for now a header/param)
  and runs `SET LOCAL app.current_tenant = :tenant_id` on the request's connection.
- A helper/migration that ENABLEs RLS and adds a policy `USING (tenant_id = current_setting(
  'app.current_tenant')::uuid)` to tenant-owned tables.
- Tests proving: with tenant A set, tenant B's rows are invisible for select/update/delete.
```
**Acceptance:** cross-tenant isolation tests pass; RLS is on for tenant-owned tables.
**Commit:** `feat(backend): multi-tenant RLS + tenancy dependency`

### P1.4 — Identity, Auth & RBAC (two audiences)
```
Read CLAUDE.md golden rules #2 and #6 and the Permissions Matrix (analysis Appendix C). Use Plan mode.
- Admin identity: admin_users, roles, permissions, role_permissions, user_roles. Support a
  SCOPED super-admin (Account Manager) via an admin_user_tenants allow-list; global super-admins
  have no restriction. Seed roles + permissions exactly from Appendix C.
- Player identity (separate audience): players table; separate auth (OTP/email + password).
- JWT access/refresh (short-lived access, rotating refresh); argon2 password hashing; OAuth2
  password + refresh flows. Distinct token audiences for admin vs player.
- A `require("resource:action")` dependency for routes; resolve effective permissions from roles,
  and constrain scoped super-admins to their allowed tenants.
- Tests: permission enforcement, audience separation, scoped-admin cannot read other tenants.
```
**Acceptance:** authz tests pass; scoped super-admin limited to assigned tenants; tokens carry audience.
**Commit:** `feat(backend): identity, JWT auth, RBAC with scoped super-admin`

### P1.5 — Tenant config, themes & the manifest endpoint
```
Read CLAUDE.md golden rule #5. Add tenant configuration and the app manifest.
- tenant_configs (api base urls, feature_flags jsonb), themes (tokens jsonb, logo/splash refs,
  is_active). Super-admin + tenant-admin CRUD (permission-gated).
- GET /config/manifest returns the resolved, versioned manifest (theme tokens + feature flags +
  content endpoints + a navigation block (tabs, center action, globals) + version). Bump version on config/theme change; make it cache-friendly (ETag).
- Tests: manifest reflects edits and version bumps; feature flags toggle module visibility.
```
**Acceptance:** editing a theme/flag changes the manifest and its version; endpoints permission-gated.
**Commit:** `feat(backend): tenant config, themes, versioned manifest`

### P1.6 — Adapter ports + mock implementations
```
Read CLAUDE.md golden rule #3. Define the integration ports and mock adapters.
- ports/: LoyaltyPort, CashlessPort, DigitalKeyPort, KycPort, GeoPort, PaymentPort, PushPort
  (typed Protocols with clear method contracts and error types).
- adapters/mock/: mock impls with realistic latency and occasional failures for testing.
- Select implementations by ADAPTER_MODE / *_PROVIDER env; inject ports via FastAPI dependencies.
- A contract-test harness that runs one suite against a port's mock (and later, real) adapter.
```
**Acceptance:** ports injected via env; contract tests pass against mocks.
**Commit:** `feat(backend): adapter ports + mock implementations`

---

# PHASE 2 — Backend domain modules

> Each module lives in `app/modules/<name>/` as models + schemas + service + router (+ tests),
> is permission-gated, tenant-scoped (RLS), and tagged in OpenAPI.

### P2.1 — CMS content & media
```
Read apps/backend/CLAUDE.md. Build the content module.
- content_items (typed CMS content: type, title, body, media_url, status, publish_at, segment).
- Media upload to MinIO/S3 (presigned or proxied); store references.
- Publishing an item bumps the tenant manifest version so clients refetch.
- Permission-gated CRUD + publish; list endpoints for the app (published, targeted).
Tests: authoring -> publish -> appears in app-facing list; manifest version bumps.
```
**Acceptance:** content CRUD + publish works; media stored; app list returns published items.
**Commit:** `feat(backend): CMS content & media`

### P2.2 — Offers & promotions
```
Build offers and promotions (share a model with a `type`, or separate — your call, document it).
- Fields: title, description, image_url, segment, start_at, end_at, status, terms.
- player_offers redemption ledger (player_id, offer_id, status, redeemed_at) — one active
  redemption per rule; enforce idempotency.
- App endpoints: list targeted offers/promotions for the current player; POST redeem.
Tests: targeting by segment; redeem writes ledger; double-redeem prevented.
```
**Acceptance:** targeted lists correct; redemption ledger enforced.
**Commit:** `feat(backend): offers, promotions, redemption ledger`

### P2.3 — Account & loyalty
```
Build the account/loyalty module backed by LoyaltyPort (mock).
- players profile; points balance, tier, activity/win-loss feed via LoyaltyPort.
- Endpoints: GET /me, /me/devices (register push token), /account/points, /account/activity.
- KYC status field + state machine placeholder (KycPort mock: pass/refer/fail).
Tests: profile + points + activity return seeded mock data; device registration.
```
**Acceptance:** `/me` and `/account/*` return coherent mock loyalty data.
**Commit:** `feat(backend): account & loyalty via LoyaltyPort`

### P2.4 — Wallet & cashless (mock)
```
Read CLAUDE.md golden rule #4. Build the wallet with an append-only ledger.
- wallets (player_id, balance_cents, currency, status); wallet_transactions (IMMUTABLE:
  type=fund|transfer_to_egm|cashout|refund, amount_cents, egm_id, external_ref, status).
- Endpoints (all require Idempotency-Key): POST /wallet/fund, /wallet/transfer, /wallet/cashout;
  GET /wallet. POST /egm/pair returns a simulated pairing session.
- Money movement goes through CashlessPort (mock host with latency/failures); balances derived
  from the ledger; reconcile via external_ref.
Tests: idempotency (same key => one txn), balance math, failure handling, ledger immutability.
```
**Acceptance:** idempotent money endpoints; derived balances correct; immutable ledger.
**Commit:** `feat(backend): wallet & cashless ledger via CashlessPort (mock)`

### P2.5 — Reservations & valet
```
Build reservations (type=hotel|dining|nightlife: status, start, end, external_ref via a booking
port mock) and valet_requests (ticket_ref, status, requested_at, ready_at). Permission-gated CRUD +
player-facing book/request/status endpoints. Tests for lifecycle transitions.
```
**Acceptance:** booking + valet lifecycles work end-to-end against mocks.
**Commit:** `feat(backend): reservations & valet`

### P2.6 — Digital key (mock)
```
Build the digital key module via DigitalKeyPort (mock ASSA ABLOY/Salto).
- digital_keys (player_id, reservation_id, room, provider, mobile_key_ref, valid_from/to, status).
- Issue a key when a hotel reservation is valid; POST /keys/{id}/unlock exercises the (mock) SDK.
Tests: key issued only for valid reservation window; unlock returns success/failure states.
```
**Acceptance:** key issuance tied to reservation; unlock flow returns clear states.
**Commit:** `feat(backend): digital key via DigitalKeyPort (mock)`

### P2.7 — Notifications & devices (push)
```
Build notifications via PushPort (APNs/FCM; mock works offline).
- devices (player_id, platform, push_token, last_seen); notifications (campaign: title, body,
  segment, schedule_at, status) + per-recipient notification_deliveries.
- Endpoints: register device; compose/segment/schedule; send now; delivery status.
- Deep-link payloads that route the app to offers/reservations.
Tests: segmentation selects the right players; delivery records written; schedule respected.
```
**Acceptance:** campaign send targets a segment and records deliveries; deep-link payloads valid.
**Commit:** `feat(backend): notifications, devices, push via PushPort`

### P2.8 — Geofencing & location triggers (the dwell use case)
```
Read the analysis Section 10. Use Plan mode. Build geofencing + a trigger engine.
- geofence_zones (tenant-scoped; type=gps|beacon; for gps: center lat/lng + radius or polygon;
  name). beacons (uuid/major/minor mapped to a zone). location_triggers (rule: zone_id,
  event=enter|exit|dwell, dwell_seconds, offer_id/promotion_id, segment, schedule, frequency_cap,
  quiet_hours). location_events (append-only audit: player, zone, event, dwell, ts, result).
- Admin CRUD: /geo/zones, /geo/triggers (permission-gated).
- Mobile: GET /geo/sync (active zones + beacons near the player, respecting client limits);
  POST /geo/events (enter/dwell/exit).
- Trigger engine service: on a qualifying event, match rules, enforce frequency_cap + quiet_hours
  + consent, then dispatch the offer via the notifications module and log to location_events.
- Encode the sample rule: "enter zone 'Steakhouse' AND dwell >= 600s -> send promo X, max 1/day".
Tests: dwell threshold honored; frequency cap and quiet hours enforced; consent required; the
Steakhouse 10-minute scenario fires exactly one push.
```
**Acceptance:** the 10-minute dwell scenario triggers one capped, consented push; events logged.
**Commit:** `feat(backend): geofencing zones/beacons + location trigger engine`

### P2.9 — Audit & analytics events
```
Read CLAUDE.md golden rule #8. Add immutable audit_logs (actor, action, entity, meta jsonb, ts)
written on every privileged/financial/config mutation via a reusable hook/middleware. Add a
lightweight analytics event sink (offer views, redemptions, trigger fires) for dashboards.
Tests: representative mutations write audit rows; audit rows are immutable.
```
**Acceptance:** privileged actions are audited; audit is append-only.
**Commit:** `feat(backend): audit logging + analytics events`

### P2.10 — Seed data + OpenAPI + generate the API client
```
- Add a seed script: one demo tenant, its theme + feature flags, admin users for each role
  (incl. a scoped Account Manager), sample players, offers/promotions, a reservation, a geofence
  zone with the Steakhouse dwell trigger; sample games (incl. a jackpot) and reward-marketplace items.
- Ensure the full OpenAPI is complete and tagged.
- Run packages/api-client `generate` against the live OpenAPI so admin + mobile get typed clients.
Tests: seed runs idempotently; api-client builds against the generated types.
```
**Acceptance:** `seed` populates a demo tenant; `packages/api-client` generates and builds.
**Commit:** `chore: demo seed data + generated API client`

### P2.11 — Games catalog & leaderboard
```
Build a games catalog + leaderboard module (tenant-scoped, CMS-managed).
- games (title, category=slots|tables, provider, thumbnail_url, volatility, is_jackpot,
  jackpot_amount, status, featured/sort). player_favorites (player_id, game_id).
- Leaderboard: rank players by loyalty/session points for a period (via LoyaltyPort).
- App endpoints: GET /games (search + filter by category), POST/DELETE /games/{id}/favorite,
  GET /games/jackpot (featured), GET /leaderboard (including the current player's rank).
This is catalog + ranking CONTENT, separate from cardless play (P2.4).
Tests: search/filter, favorites, leaderboard including the player's own position.
```
**Acceptance:** filtered catalog + favorites + leaderboard (with own rank) work.
**Commit:** `feat(backend): games catalog & leaderboard`

### P2.12 — Rewards marketplace
```
Build a points rewards marketplace.
- reward_items (title, image_url, category, points_cost, stock, status, terms).
  reward_redemptions (player_id, reward_item_id, points_spent, status, created_at) — append-only.
- Redeem deducts loyalty points via LoyaltyPort, decrements stock, is idempotent
  (Idempotency-Key); reject on insufficient points or out of stock.
- Endpoints: GET /rewards, POST /rewards/{id}/redeem, GET /me/redemptions.
Tests: redeem deducts points + stock once; insufficient-points and out-of-stock paths.
```
**Acceptance:** redemption deducts points/stock idempotently; error paths handled.
**Commit:** `feat(backend): rewards marketplace`

### P2.13 — Support AI chat (help assistant)
```
Build a SUPPORT assistant via a ChatPort adapter (mock LLM in MVP; real provider by env). It answers
help/FAQ questions only — NO transactional actions (no booking, redeeming, or moving money).
- chat_sessions + chat_messages (tenant-scoped, player-linked). Per-tenant knowledge base / FAQ and
  a system prompt + guardrails.
- Escalation: open a support ticket / hand off to a human on low confidence or on request.
- Endpoints: POST /support/chat (message -> reply), GET /support/history, POST /support/escalate.
- Respect Responsible-Gaming + consent rules; log conversations to audit.
Tests: FAQ answered from tenant knowledge; escalation path; assistant refuses transactional asks.
```
**Acceptance:** support chat answers from tenant FAQ and escalates; no transactional actions.
**Commit:** `feat(backend): support AI chat via ChatPort (mock)`

---

# PHASE 3 — Unified Admin Console (CMS Portal)

> One React app = tenant CMS + super-admin (Platform | Casino roles), gated by RBAC. Recreate the
> `design_handoff_casino_cms` spec in our stack (React+Vite+TS+RTK+TanStack+Tailwind+Lucide). Tokens:
> luxury LIGHT+DARK, gold #E6B450, Bodoni Moda (display) / Manrope (UI) / JetBrains Mono; the design's
> Phosphor icons map to Lucide by semantic name. Screen IDs reference design/CMS_SCREEN_INVENTORY.md.
> Put the design tokens in design/ first.

### P3.1 — Scaffold, design system & app shell
```
Read apps/admin/CLAUDE.md + design/CMS_SCREEN_INVENTORY.md. Scaffold Vite+React+TS. Build the token
system with LIGHT + DARK (data-theme), gold #E6B450, Bodoni Moda/Manrope/JetBrains Mono; base
components (buttons, inputs, table, tabs, modal, toasts, status pills, toggle switch) per the design.
App shell: 250px sidebar (brand lockup, tenant switcher, grouped nav with active gold dot), 64px
topbar (breadcrumb, Cmd-K search, role segmented control, theme toggle, notification bell, gold
Create button). TanStack Router; RTK Query base -> packages/api-client. No hardcoded colors.
Screens (see design/CMS_SCREEN_INVENTORY.md): SHELL
```
**Acceptance:** shell renders in light + dark; nav switches views; components match tokens.
**Commit:** `feat(admin): scaffold, design system (light+dark), app shell`

### P3.2 — Auth, roles (Platform|Casino) & RBAC nav
```
Login (admin audience), token storage + refresh, logout. A <Can permission> guard + useHasPermission
from server permissions. The Platform | Casino role switch in the topbar swaps nav set, tenant, user,
breadcrumb, and search scope, and resets to Dashboard. Support the SCOPED super-admin (Account
Manager): only their assigned tenants. Route + nav guards mirror the server (the real guard).
Also build the Users & Roles screen: manage admin users, assign roles (incl. per-tenant
scoping for Account Managers), and view a role's permission checklist (Permissions Matrix).
Screens: SHELL (role switch), login, USR Users & Roles
```
**Acceptance:** unauthorized routes/actions hidden AND blocked by the API; role/tenant switch works.
**Commit:** `feat(admin): auth, Platform/Casino roles, RBAC nav`

### P3.3 — Casino management (Platform) + Feature Flags
```
Build the Casinos area (Platform, permission-gated): Directory (filterable table -> row opens detail);
Property Detail (stat cards + feature-configuration toggles + publishing-history timeline); Creation
Wizard (5 steps: Basics, Branding, Features, Theme, Review & Launch). Plus a dedicated Feature Flags
screen (name+tag, scope, rollout %, toggle). Wire to tenant + config APIs.
Screens: CAS1 Directory, CAS2 Property Detail, CAS3 Creation Wizard, FLG Feature Flags
```
**Acceptance:** provision a tenant via the wizard; toggle a feature flag; all permission-gated.
**Commit:** `feat(admin): casino directory/detail/creation wizard + feature flags`

### P3.4 — Theme management (branding studio)
```
Build Theme Management: brand colors, typography, navigation-style radio cards, asset uploads, with a
sticky live mobile preview of the themed home. Writes theme tokens; publish bumps the manifest
version. Light+dark aware. Permission-gated.
Screens: THM
```
**Acceptance:** editing tokens updates the live preview + manifest version.
**Commit:** `feat(admin): theme management + live preview`

> **Scope constraint (added 2026-07-02, applies whenever this screen is built or revisited):**
> "typography" here means selecting a **font pairing from the app's bundled, curated set**
> (enum `typography.pairing` in the manifest) — NOT free-form font-family input or font uploads.
> Mobile fonts ship in the binary; arbitrary tenant fonts would need a build + store release and
> a licensing check, which breaks the no-rebuild white-label model. Keep the curated set to
> open-license fonts. Custom per-tenant fonts are a gated later-phase feature
> (see docs/WHITE_LABEL_CUSTOMIZATION_ROADMAP.md §3.21). Font sizes/weights stay token values
> (pack-driven), not per-tenant free-form fields.

### P3.5 — Content authoring
```
Build content management: list/create/edit/schedule/publish content items with media (from the Media
Library, P3.13), segment targeting, and status. Publishing bumps the manifest. Wire to the content API.
Screens: CNT
```
**Acceptance:** author -> schedule -> publish content; targeting + media set.
**Commit:** `feat(admin): content authoring`

### P3.6 — Promotions & Offers (separate screens)
```
Build TWO peer screens (Offers and Promotions stay separate):
- Promotions: List + Calendar (month grid, event chips) + Detail (targeting, schedule, performance).
- Offers: List + Detail/redeem-config + performance.
Both: create/edit, segment targeting, schedule, publish. Wire to the offers + promotions APIs.
Screens: PRO1 Promotions List, PRO2 Promotions Calendar, PRO3 Promotion Detail, OFR Offers
```
**Acceptance:** author + publish a promotion (list+calendar) and an offer; both appear in the app.
**Commit:** `feat(admin): promotions (list/calendar/detail) + offers`

### P3.7 — Notifications (multi-channel)
```
Build notifications: campaign table (channel Push/In-App/Email/SMS, audience, sent, open-rate) +
composer with a live push preview and A/B test config. Segment, schedule, send. Wire to the
notifications API (PushPort + channels).
Screens: NOT
```
**Acceptance:** compose + send a multi-channel campaign to a segment; deliveries + A/B visible.
**Commit:** `feat(admin): multi-channel notifications + composer`

### P3.8 — Geofencing / Location Campaigns (map)
```
Read analysis Section 10. Build the location-campaign editor with MapLibre GL (design uses Mapbox):
drop point + radius, draw polygon, or register beacons to a named zone (e.g., "Steakhouse"); rule
builder (enter/exit/dwell, threshold minutes, attached offer/promo, segment, schedule, frequency cap,
quiet hours). Include the "enter Steakhouse + dwell 10 min -> promo, 1/day" template. Wire to
/geo/zones and /geo/triggers.
Screens: GEO1 Zones (map), GEO2 Triggers
```
**Acceptance:** create the Steakhouse dwell trigger visually; it persists via the API.
**Commit:** `feat(admin): geofencing zone + trigger editor`

### P3.9 — Operations: Hotel, Dining, Entertainment, Valet, Reservations
```
Build the operations screens (permission-gated, tenant-scoped):
- Hotel: room-type cards (image, availability, occupancy, rate) + amenities + digital-room-keys config.
- Dining: restaurants table + today's specials / happy hours.
- Entertainment: event cards (date, type, venue, ticket status).
- Valet: config + live request queue (ticket, status, requested/ready).
- Reservations queue: cross-venue bookings list (who/what/when/status).
Wire to reservations/valet/digital-key APIs (mock adapters).
Screens: HTL Hotel, DIN Dining, ENT Entertainment, VAL Valet, RSV Reservations queue
```
**Acceptance:** configure a room type + restaurant + event; see the valet queue and a bookings list.
**Commit:** `feat(admin): hotel, dining, entertainment, valet, reservations`

### P3.10 — Rewards (tiers + marketplace) & Games
```
Build:
- Rewards: 5-tier ladder (thresholds, member %, benefits) + points-earning rules + bonus campaigns,
  AND the Rewards Marketplace item catalog (image, points cost, stock, status) from P2.12.
- Games: catalog curation (category, provider, thumbnail, volatility, jackpot-of-the-day, featured/
  sort) + a read-only leaderboard view.
Wire to /rewards and /games.
Screens: RWD1 Tiers, RWD2 Points rules, RWD3 Marketplace items, RWD4 Bonus campaigns, GAM Games
```
**Acceptance:** edit tiers/points; add a marketplace item; curate the jackpot game; all appear in-app.
**Commit:** `feat(admin): rewards (tiers + marketplace) + games curation`

### P3.11 — Support assistant configuration
```
Configure the SUPPORT assistant per tenant (permission-gated): knowledge base / FAQ, system prompt +
guardrails, canned replies, escalation routing. Optional: recent conversations + deflection metric.
Wire to /support/*.
Screens: SUP
```
**Acceptance:** edit FAQ/guardrails/escalation; changes affect the assistant; conversations viewable.
**Commit:** `feat(admin): support assistant configuration`

### P3.12 — Homepage Builder & Navigation Builder (drag-drop)
```
Build two manifest-driven builders (real HTML5 drag-and-drop):
- Homepage Builder: widget palette + phone canvas + properties panel. Drag widgets (Hero, Carousel,
  Promotions, Loyalty Card, Events, Dining, Hotel, Video, News, Quick Actions, Personalized,
  Recommends) onto the canvas; reorder; select to edit props; Draft/Preview/Publish. Output = the
  tenant Home module list in the manifest.
- Navigation Builder: reorderable mobile nav items (icon, label, deep-link, enable toggle) beside a
  phone preview of the bottom tab bar. Output = the manifest `navigation` block (Option B: Home,
  Offers, center Scan/Play, Account, More; center action respects the cashless flag).
Screens: HPB Homepage Builder, NAV Navigation Builder
```
**Acceptance:** compose a home + reorder the nav; both persist to the manifest and drive the app.
**Commit:** `feat(admin): homepage + navigation builders (manifest-driven)`

### P3.13 — Media Library
```
Build the Media Library (DAM): folder rail + storage meter + asset grid (thumb, type badge
IMG/VID/PDF/SVG, name, size, usage) + toolbar (search, type/tag filters, grid/list). Upload to object
storage; assets are referenced by content/theme/homepage. Tenant-scoped.
Screens: MED
```
**Acceptance:** upload + browse + filter assets; reference one from content.
**Commit:** `feat(admin): media library`

### P3.14 — Localization
```
Build Localization: languages table (flag, name, code, translation progress bar + %) + Regional
Formats card (currency, timezone, date format, first day, number format). Manage translation keys per
tenant; feed the app's language options.
Screens: LOC
```
**Acceptance:** add a language + edit keys; progress reflects; the app can consume the locale.
**Commit:** `feat(admin): localization`

### P3.15 — Players / Members (CRM, PII-gated)
```
Build a player 360 (permission-gated, PII-sensitive):
- Members list: search/filter (tier, status, KYC), columns with masked identifiers.
- Member profile: loyalty (points/tier/activity), wallet + transactions (read), KYC status, comps,
  reservations, support history, consent/RG flags.
PII POLICY: full PII (DOB, gov ID, KYC docs) is MASKED by default; unmasking AND any export require an
elevated permission and write an audit_log entry. Marketers/editors get NO player-level PII (segments
only); wallet/transaction detail is limited to admin/finance/support roles.
Screens: MBR1 Members list, MBR2 Member profile
```
**Acceptance:** search a player; view masked profile; unmask/export is gated + audited; marketer blocked.
**Commit:** `feat(admin): players/members CRM (PII-gated)`

### P3.16 — Compliance & Responsible Gaming
```
Build Compliance & RG (permission-gated): KYC provider config + review queue (KycPort); Responsible-
Gaming controls (deposit/time-limit defaults, cool-off, self-exclusion list + import/export);
geolocation/jurisdiction rules (GeoPort). All actions audited.
Screens: CMP
```
**Acceptance:** set an RG limit + add a self-exclusion; act on a KYC case; changes audited.
**Commit:** `feat(admin): compliance & responsible gaming`

### P3.17 — Audit & Publishing pipeline
```
Build Audit & Publishing: the publishing pipeline (Draft -> In Review -> Approved -> Published with
counts + approval actions, respecting RBAC) and the Audit Log (who/action/object + timestamp +
rollback). Publishing bumps the manifest; rollback reverts.
Screens: AUD
```
**Acceptance:** move an item through the pipeline with approvals; audit records it; rollback works.
**Commit:** `feat(admin): audit & publishing workflow`

### P3.18 — Settings, Integrations & Cashless oversight
```
Build Settings: an integrations grid mapped to our ADAPTER PORTS (IGT Gaming->CMP, Agilysys PMS->
reservations, Comarch->LoyaltyPort, Stripe->PaymentPort, Twilio->push/SMS, Okta->SSO, Mapbox->geo)
with per-tenant credentials; API keys (masked + copy); Security & Auth (SSO, MFA, IP allowlist,
session timeout). Add a Payments & Cashless panel: enable/limits + a wallet transactions/
reconciliation view (read).
Screens: SET Settings & Integrations, PAY Payments & Cashless
```
**Acceptance:** configure an integration + API key + security toggle; view cashless transactions.
**Commit:** `feat(admin): settings, integrations, API keys, cashless oversight`

### P3.19 — Dashboard & Analytics
```
Build the role-aware Dashboard (greeting, KPI row differing by Platform/Casino, app-sessions area
chart, system health, approval queue, recent changes, feature-flags + scheduled) and the Analytics
screen (Active Users/Avg Session/Redemptions/Retention KPIs, DAU dual-line, revenue-by-channel donut,
top-promotions bars, push funnel). Data via analytics endpoints.
Screens: DSH Dashboard, ANL Analytics
```
**Acceptance:** dashboard KPIs change by role; analytics charts render from seeded data.
**Commit:** `feat(admin): role-aware dashboard + analytics`

---

# PHASE 4 — Mobile app (Bare React Native)

> White-label: no hard-coded brand — theme + features come from the manifest. Ensure `design/` is set.

### P4.1 — Bare RN init, navigation, design system
```
Read apps/mobile/CLAUDE.md. Initialize a bare React Native (TypeScript) app in apps/mobile.
- React Navigation, Redux Toolkit store, react-native-keychain for secure storage.
- Build the mobile design system from design/ (shared token names with admin + manifest).
- Set up iOS schemes + Android product flavors for per-tenant white-label builds (name/icon/
  bundle id/signing from a per-tenant build config file).
- A ThemeProvider + FeatureProvider skeleton (values filled from the manifest next).
Screens (see design/SCREEN_INVENTORY.md): A1, G1, G8
```
**Acceptance:** app builds/runs on iOS + Android sims; navigation + theming skeleton render.
**Commit:** `feat(mobile): bare RN init, navigation, design system, flavors`

### P4.2 — Manifest resolution, dynamic theming & API client
```
- On launch/refresh: fetch /config/manifest; hydrate ThemeProvider (tokens) and FeatureProvider
  (flags). Cache with the manifest version/ETag; refetch on change.
- Wire RTK Query to packages/api-client. Feature flags show/hide modules.
Test: switching the seeded tenant's theme/flags changes the app without a rebuild.
Screens (see design/SCREEN_INVENTORY.md): A1, M4, G6, G7
```
**Acceptance:** theme + enabled modules driven entirely by the manifest.
**Commit:** `feat(mobile): manifest-driven theming + feature flags`

### P4.3 — Auth & enrolment
```
Build player auth (separate audience): OTP/email + password enrolment and login; store JWTs in
Keychain/Keystore; silent refresh; logout. Gate the app behind auth; register the device push
token on login.
Screens (see design/SCREEN_INVENTORY.md): A3, A4, A5, A8, M13
```
**Acceptance:** enrol/login/refresh/logout work; device registered.
**Commit:** `feat(mobile): auth & enrolment`

### P4.4 — Home, offers & promotions
```
Build Home (brandable hero + tiles from manifest), Offers list + detail + redeem, and Promotions.
Render targeted content from the API; redeem writes the ledger and reflects state.
Screens (see design/SCREEN_INVENTORY.md): H1, H2, H3, O1, O2, O3, O4, O6, G3
```
**Acceptance:** seeded offers render + redeem; state updates.
**Commit:** `feat(mobile): home, offers, promotions`

### P4.5 — Account & loyalty
```
Build Account: points, tier progress, activity/win-loss, profile, and KYC status (from KycPort
mock states). Pull from /me and /account/*.
Screens (see design/SCREEN_INVENTORY.md): C1, C2, C3, C4, C15, A9, M10
```
**Acceptance:** account screens show coherent loyalty + KYC data.
**Commit:** `feat(mobile): account & loyalty`

### P4.6 — Wallet & cardless BLE (mock)
```
Read CLAUDE.md golden rule #4. Build Wallet: fund, transfer-to-EGM, cash-out, history — all with
idempotency keys and clear pending/success/failure states. Build slot pairing with
react-native-ble-plx against a SIMULATED peripheral (mock), plus a QR-code fallback. Money moves
via the wallet API (CashlessPort mock).
Screens (see design/SCREEN_INVENTORY.md): S1-S10
```
**Acceptance:** wallet flows are idempotent + clear; BLE pairing sim + QR fallback demo works.
**Commit:** `feat(mobile): wallet + cardless BLE (mock) + QR fallback`

### P4.7 — Reservations & valet
```
Build Reservations (browse/book/manage hotel/dining/nightlife) and Valet (request + track status).
Wire to the reservations/valet APIs.
Screens (see design/SCREEN_INVENTORY.md): C10, C11, C12, C13
```
**Acceptance:** book a reservation + request valet against mocks.
**Commit:** `feat(mobile): reservations & valet`

### P4.8 — Digital key (mock)
```
Build Digital Key: show an issued key for a valid hotel reservation and an Unlock action that
calls native/digitalKey.ts — a STUB wrapper behind the DigitalKeyPort contract (real ASSA
ABLOY/Salto SDK swaps in later). Real issue/display/unlock UX with success/failure states.
Screens (see design/SCREEN_INVENTORY.md): C14
```
**Acceptance:** key displays for a valid reservation; unlock returns clear states (mock).
**Commit:** `feat(mobile): digital key (mock SDK wrapper)`

### P4.9 — Push notifications & deep links
```
Integrate Notifee + @react-native-firebase/messaging (APNs/FCM). Handle foreground/background/
quit-state notifications; route deep links to offers/reservations; sync device token. Works with
the backend mock sender in dev.
Screens (see design/SCREEN_INVENTORY.md): G2, M5, M6
```
**Acceptance:** a test campaign deep-links into the right screen.
**Commit:** `feat(mobile): push notifications + deep links`

### P4.10 — Geofencing & beacons (dwell trigger)
```
Read the analysis Section 10. Use Plan mode. Implement location-triggered campaigns end-to-end.
- native/geofence.ts: OS region monitoring (iOS Core Location, Android Geofencing) for GPS zones.
- native/beacons.ts: iBeacon ranging for indoor dwell.
- On launch: GET /geo/sync; register the nearest zones (respect iOS's ~20 monitored-region limit).
- Detect enter/exit; for dwell, confirm continuous presence for the threshold; POST /geo/events.
- Require explicit location + background-location opt-in with a clear purpose prompt; respect
  consent + quiet hours. Handle background wake-ups; avoid constant polling (battery).
Demo: entering the Steakhouse zone and staying 10 minutes results in exactly one promo push.
Screens (see design/SCREEN_INVENTORY.md): A7 (location consent); trigger -> G2/O2
```
**Acceptance:** the Steakhouse 10-minute dwell demo fires one promo push; consent enforced.
**Commit:** `feat(mobile): geofencing + beacons dwell triggers`

### P4.11 — Games catalog & leaderboard (Gaming tab)
```
Build the Gaming tab (adapt to the final screen set): search titles; All/Slots/Tables filter; a
"Jackpot of the day" feature card with Play Now (routes to cardless pairing, P4.6); a Favorite
Games grid with volatility labels (favorite/unfavorite); and a Leaderboard showing top players
plus the current player's rank. Wire to /games and /leaderboard.
Screens (see design/SCREEN_INVENTORY.md): C5, C8, C9, G3
```
**Acceptance:** search/filter, favorites, jackpot feature, and leaderboard render from the API.
**Commit:** `feat(mobile): games catalog & leaderboard`

### P4.12 — Rewards marketplace & tier progress
```
Build the Rewards Marketplace + tier view: browse reward items with points cost, view details,
and redeem with a confirmation reflecting the points balance and the idempotent result
(success / insufficient points / out of stock). Show tier progress ("X points until next tier")
and benefits. Wire to /rewards and /account.
Screens (see design/SCREEN_INVENTORY.md): C6, C7, O5, C3
```
**Acceptance:** redeem a reward; balance + state update; tier progress shows.
**Commit:** `feat(mobile): rewards marketplace + tier progress`

### P4.13 — Biometric login ("Identify to Enter")
```
Add biometric unlock on top of auth (P4.3): Face ID / Touch ID / Android biometrics via
react-native-keychain (or react-native-biometrics) gating the securely stored refresh token,
with a passcode fallback and a "Use passcode / Help" path (per the design). Enroll biometrics
after first login; handle lockout/failure. No secrets leave the device; the backend still
validates the refresh token.
Screens (see design/SCREEN_INVENTORY.md): A2, A6, M2
```
**Acceptance:** biometric unlock yields a valid session; passcode fallback works; secure storage only.
**Commit:** `feat(mobile): biometric login`

### P4.14 — Support chat + config-driven navigation
```
Two things:
1) Support chat UI under More -> Support (plus contextual "Need help?" entry points): message thread,
   send, escalate-to-human, history. Wire to /support/*.
2) Refine the P4.1 shell into CONFIG-DRIVEN bottom navigation from the manifest `navigation` block
   (Option B): tabs Home - Offers - center Scan/Play - Account - More; the Offers tab uses a
   segmented control (Offers | Promotions | My Rewards); globals = notifications + search. Respect
   feature flags: if cashless is off, the center Scan/Play falls back to Wallet (or the manifest's
   specified action). Labels are localized.
Screens (see design/SCREEN_INVENTORY.md): M1, M3, M7, M8, M9, M11, M12, G1
```
**Acceptance:** nav renders from the manifest incl. center action + fallback; support chat works.
**Commit:** `feat(mobile): support chat + config-driven navigation`

---

# PHASE 5 — Wire it together, test & demo

### P5.1 — Full-stack wiring & environments
```
- Make `docker compose up -d` + backend + admin + mobile run against one another locally via env
  (VITE_API_BASE_URL, mobile API base per scheme/flavor). Document the dev run in README.
- Add a root task that (re)generates packages/api-client from the running backend OpenAPI and
  fails CI if the client is out of date.
```
**Acceptance:** all three apps talk to the local backend; stale api-client fails CI.
**Commit:** `chore: full-stack local wiring + api-client drift check`

### P5.2 — End-to-end vertical slice verification
```
Prove the core promise end-to-end: using the seeded demo tenant, (1) change its theme in the
admin and confirm the mobile app re-themes from the manifest without a rebuild; (2) publish an
offer in the admin and confirm it appears + redeems in the app; (3) send a push and confirm the
deep link. Write a short scripted checklist and automate what you can.
```
**Acceptance:** theme, offer, and push changes flow admin -> API -> app live.
**Commit:** `test: end-to-end vertical slice (theme/offer/push)`

### P5.3 — Test suites & coverage
```
- Backend: pytest coverage across modules incl. RLS isolation, authz, idempotent money, the
  geofence dwell engine, and adapter contract tests.
- Admin: Vitest + Testing Library for components/hooks; Playwright for a login -> provision tenant
  -> publish offer flow.
- Mobile: Jest unit tests; Detox E2E for auth -> offers -> wallet(mock) -> geofence dwell(sim).
```
**Acceptance:** CI runs all suites green; critical paths covered.
**Commit:** `test: backend/admin/mobile suites + E2E`

### P5.4 — Demo script (investor/operator)
```
Produce docs/DEMO.md: a repeatable script that (1) provisions a new tenant in the admin,
(2) themes it live, (3) publishes an offer + sends a push, (4) runs the cardless BLE(mock) +
digital-key(mock) demos, browses the games catalog and redeems a marketplace reward, and (5) triggers the Steakhouse 10-minute geofence promo — end to end.
Include reset/seed steps.
```
**Acceptance:** a newcomer can run the full demo from docs/DEMO.md.
**Commit:** `docs: end-to-end demo script`

### P5.5 — CI/CD & pre-commit
```
Add GitHub Actions: install, lint, typecheck, test, build for all workspaces; api-client drift
check; backend migration check; artifact builds. Add pre-commit hooks (ruff/mypy for backend,
eslint/prettier for JS). Document RN build/signing steps (fastlane) for later store submission.
```
**Acceptance:** CI is green on a clean checkout; hooks run locally.
**Commit:** `ci: pipelines + pre-commit hooks`

---

# PHASE 6 — AI Concierge (agentic recommendations, MCP-style)

> Added 2026-07-02, **append-only** — nothing above changes. Full rationale + architecture:
> `docs/AI_CONCIERGE_INTEGRATION.md`. Concierge = answers-first recommendations (visit-fit, ranked
> offers, plan-my-visit) built as an orchestrator over MCP-shaped internal tools + WeatherPort /
> TravelPort / LlmPort. Persona/branding is tenant-configurable ("Aria" is only the seed default).
> Dependencies: P6.1–P6.3 need only Phase 2 (done); P6.4 needs P3.2; P6.5–P6.6 need P4.4; P6.7 last.
> Zero-risk default: run after P5.5. RG guardrails + consent + audit are non-negotiable throughout.

### P6.1 — WeatherPort, TravelPort & concierge data model
```
Read CLAUDE.md golden rule #3 and docs/AI_CONCIERGE_INTEGRATION.md §4. Backend only.
- Ports: WeatherPort.get_forecast(lat,lng,days); TravelPort.get_travel_time(origin,dest,depart_at)
  + get_traffic_window(origin,dest,date_range). Adapters: real = Open-Meteo (keyless) and
  OSRM/haversine speed model; mock = deterministic (seeded by date) for offline demos/tests.
  Select by ADAPTER_MODE; Redis cache (weather 30min, travel 5min); contract tests for both modes.
- Migrations: properties (tenant-scoped: name, lat/lng, amenities jsonb, status);
  players.home_origin (nullable) + players.concierge_consent (bool default false);
  player_preferences (favorite property/dining/experiences).
- Extend LoyaltyPort: get_player_value() -> worth band, ADT, visit_frequency, recent_visit_gap;
  mock returns 3 personas (regional commuter, weekend destination, high-value local).
Tests: adapter contracts (real skipped offline), cache TTLs, RLS on new tables.
```
**Acceptance:** forecast + travel time work in mock and real modes; new tables RLS-scoped.
**Commit:** `feat(backend): WeatherPort/TravelPort + concierge data model`

### P6.2 — Concierge tool registry + scoring service
```
Build app/modules/concierge/ tools + scoring (NO LLM yet — deterministic and unit-tested).
- Tool registry: MCP-shaped tools (name, JSON-schema args, typed result) wrapping existing
  services under the caller's RLS context: get_player_profile, get_player_value, get_tier_progress,
  list_offers(ranked), list_trip_history, get_preferences, get_recent_activity,
  list_nearby_properties, weather.get_forecast, maps.get_travel_time. Each result carries its
  source id (player-mcp | offers-mcp | weather-mcp | maps-mcp) for UI source chips.
- Scoring: visit_fit(0-100) = w·(value_at_risk, weather_fit, travel_fit, tier_urgency);
  offer_score = relevance × urgency × feasibility_today -> top 5-10 with machine-readable
  why_you reasons. Weights from tenant config (defaults seeded).
Tests: scoring is pure/deterministic; ranking stable; missing inputs degrade (no origin -> no
travel_fit, flagged in reasons); tenant isolation on every tool.
```
**Acceptance:** tools return sourced, tenant-scoped data; scores deterministic and explainable.
**Commit:** `feat(backend): concierge tool registry + scoring`

### P6.3 — Concierge orchestrator, LlmPort & endpoints
```
Use Plan mode. Read AI_CONCIERGE_INTEGRATION.md §3-4 (guardrails + envelope).
- LlmPort (separate from support ChatPort): mock = scripted narration from structured scores
  (offline demo); real = Claude by env. One system prompt PER use case (verdict/evidence/CTA
  schema; temp 0.3 verdicts, 0.7 chat). LLM narrates — it never computes numbers or invents
  offers/terms; failed tool -> "couldn't reach X, here's what I know without it".
- Orchestrator: plan tools per use case -> call in parallel -> score -> narrate -> return the
  uniform envelope {verdict, fit_score, confidence, reasons[], signals[], sources[], cta,
  disclaimer} + answer cache (player, use_case, context_hash) ~5min.
- Endpoints: GET /concierge/brief?horizon=today|weekend; GET /concierge/offers;
  POST /concierge/plan; POST /concierge/ask + GET /concierge/history.
- GUARDRAILS: players with RG flags (self-exclusion/cool-off/limits) get NO proactive visit
  nudges (neutral brief); concierge_consent required for stored-origin travel math; quiet hours +
  frequency caps; every answer -> append-only concierge_answers audit row (inputs hash, tools
  called, scores, output). Regenerate packages/api-client (additive).
Tests: envelope shape; RG-flagged player gets neutral brief; consent gating; cache hits; audit rows.
```
**Acceptance:** three use cases answer end-to-end in mock mode with sources + guardrails enforced.
**Commit:** `feat(backend): concierge orchestrator + LlmPort + endpoints`

### P6.4 — Admin: Concierge Studio
```
One admin screen (existing P3 patterns, permission-gated, tenant-scoped).
- Enable/disable concierge (writes the manifest feature flag; publish bumps manifest version).
- Persona: name, tone preset, orb accent token. Scoring weights with a live preview panel that
  calls /concierge/brief for a seed player. Guardrails: quiet hours, frequency cap; RG policy is
  displayed as enforced (not disable-able). Audit view of recent concierge_answers.
Tests: RBAC gating; weight change reflects in preview; publish bumps manifest.
```
**Acceptance:** tenant can configure persona/weights/flag; RG enforcement visible; audited.
**Commit:** `feat(admin): concierge studio`

### P6.5 — Mobile: concierge UI kit
```
Manifest-token-driven RN components (no hardcoded brand values — golden rule #5):
<RecoHero> (verdict + fit score + reason chips + CTA), <WhyYouPill>, <OfferCard rank/why-you>,
<AriaOrb> (persona accent from manifest; reanimated drift/pulse), <AIAnswerCard> (headline +
signal grid + source chips), <SignalTile>, <SourceChip>, <ContextStrip> (weather · drive · traffic).
Motion: hero entrance stagger + orb only. Storybook/dev screen with all states incl. degraded
(missing source) and RG-neutral variants.
```
**Acceptance:** kit renders from manifest tokens in light/dark; degraded + neutral states covered.
**Commit:** `feat(mobile): concierge UI kit`

### P6.6 — Mobile: Home hero, For You offers & Ask AI
```
Wire the kit to /concierge/* (generated client). Feature-flag `concierge` everywhere; flag off ->
today's static Home recommendations (no dead ends).
- Home: recommendations slot becomes the concierge hero (prefetch during splash/manifest resolve —
  NO spinner on Home) + context strip; CTA -> plan bottom-sheet (POST /concierge/plan).
- Offers tab: add "For You" ranked view with why-you pills; full list stays a segment away.
- Ask AI screen: opened from the Home hero + global entry (NOT a tab; More ▸ Support unchanged).
  Streamed answers rendered as AIAnswerCard with source chips + suggested follow-ups; consent
  prompt on first use if home_origin is needed; small-type advisory disclaimer under the hero.
Tests: flag fallback; prefetch path; consent flow; RG-neutral rendering.
```
**Acceptance:** brief pre-rendered on Home; ranked offers show reasons; Ask AI answers with sources.
**Commit:** `feat(mobile): concierge home hero + for-you offers + ask screen`

### P6.7 — Seed, metrics & demo
```
- Seed: "Luminara" sample concierge config on the demo tenant (persona "Aria", amber accent
  token), 3 player-value personas, ~10 hand-tuned scored offers, 2 properties with real lat/lng.
- Analytics events via the P2.9 sink: answer_accepted (hero CTA), for_you_offer_click vs
  list_offer_click, ask_to_action, brief_render_ms. Extend docs/DEMO.md with the 90-second
  concierge demo: Home verdict -> For You why-you offer -> Ask "is it worth driving in this
  weekend?" -> signal grid + source chips.
Tests: seed idempotent; events written.
```
**Acceptance:** demo runs end-to-end from docs/DEMO.md in mock mode with no keys.
**Commit:** `feat: concierge seed + metrics + demo script`

---

# PHASE 7 — White-label Appearance: Splash & Bottom Nav variants

> Added 2026-07-02 (rev. same day: 4 variants per the design handoff), **append-only** — nothing
> above changes; safe to queue behind whatever is currently running. Full option catalog + phasing
> rationale: `docs/WHITE_LABEL_CUSTOMIZATION_ROADMAP.md`.
> Scope (decided): **4 splash variants** — `journey` (Destination Journey), `collection`
> (The Collection), `portal` (Luxury Portal), `silk` (Silk Wave) — and **2 bottom-nav styles**
> (Floating Pill, Editorial), both tenant-selected in the CMS Portal, delivered via the manifest
> (golden rule #5) — no rebuild per tenant. **`silk` is the system default/fallback** (the
> handoff's `horizon` flagship is NOT in MVP scope). Nav styles are **visual treatments only**;
> the Option B structure (Home · Offers · center Scan/Play · Account · More) and the center
> action's cashless-flag fallback are unchanged.
> **Splash designs are in `design/splash/`** (high-fidelity handoff: `README.md` +
> `Splash Variant Studio.dc.html` is the authoritative motion/interpolation spec — open in a
> browser with `support.js` alongside). **Nav styles have NO design file (decided): Claude Code
> designs them in P7.4** from the app's existing design system/tokens and the splash handoff's
> visual language.
> Dependencies: P7.1 needs P1.5; P7.2 needs P3.4 (+ P3.12 for the nav picker placement);
> P7.3–P7.4 need P4.2. Run order: P7.1 → P7.2 → P7.3 → P7.4.
> Open design item for P7.3 `collection`: the logged-out/anonymous card state (see prompt).

### P7.1 — Manifest schema: `splash` block + `navigation.style` (backend)
```
Read CLAUDE.md golden rule #5, docs/WHITE_LABEL_CUSTOMIZATION_ROADMAP.md §2, and
design/splash/README.md (manifest-relevant fields only). Backend only.
Extend the tenant manifest (P1.5) additively:
- New `splash` block: { variant: "journey"|"collection"|"portal"|"silk" (default "silk"),
  logoAssetId, backgroundValue: [topHex, bottomHex], taglineText (optional, localizable key),
  animationDurationMs (optional — RESCALES the variant's native timeline linearly; clamp
  1800–3000; absent = variant native duration), environmentTheme:
  "coast"|"mountain"|"desert"|"skyline"|"forest" (used by "journey" only; default "coast";
  themes are CMS catalog entries — two SVG path strings each — so new themes need no app release) }.
  Server-side validation: known enums only; clamp duration; logo asset must exist in the tenant
  Media Library.
- New `navigation.style`: "floatingPill" | "editorial" (default "editorial"). This is a SIBLING of
  the existing `navigation.tabs` — tab structure/flags are untouched.
- Forward compatibility: all appearance enums are versioned; the manifest endpoint never 500s on
  config it can't validate — it falls back to the documented default ("silk" / "editorial") and
  logs a warning. Document the fallback defaults in the manifest schema (shared-types).
- Editing these via the tenant-config API is permission-gated (theme/appearance permission per
  Appendix C) and writes an audit_logs row; publish bumps the manifest version.
Update packages/shared-types Manifest type; regenerate packages/api-client (additive).
Tests: validation clamps + rejects unknown enums on WRITE but tolerates them on READ (fallback);
environmentTheme only accepted with variant "journey" (warn otherwise); RLS on config; audit row
on change; manifest version bump on publish.
```
**Acceptance:** manifest serves `splash` + `navigation.style` with validated values and safe fallbacks; api-client regenerated.
**Commit:** `feat(backend): manifest splash block + navigation.style enum`

### P7.2 — Admin: Appearance — Splash gallery + Nav style picker + typography retrofit
```
Extend the CMS Portal (existing P3 patterns; permission-gated; tenant-scoped). Three changes:
- RETROFIT the existing Theme Management typography section (built in P3.4 BEFORE the font
  constraint was decided — see the note under P3.4): audit what P3.4 actually built. If it allows
  free-form font-family input or font upload, REPLACE that with a curated pairing picker
  (`typography.pairing` enum — gallery cards showing each display+UI pairing rendered live);
  migrate any existing tenant font config to the nearest pairing. If P3.4 already built a
  constrained picker, just align it to the `typography.pairing` manifest key. Backend: add the
  enum to the manifest schema (same P7.1 pattern: versioned, default = tokens.json pairing,
  read-side fallback). Sizes/weights remain token values — remove any free-form size fields.
- Theme Management (P3.4) gains a "Splash Screen" section: a 4-card visual gallery — Destination
  Journey (`journey`) / The Collection (`collection`) / Luxury Portal (`portal`) / Silk Wave
  (`silk`) — with an animated thumbnail per variant, plus the config form (logo from Media
  Library, background gradient [top,bottom], tagline, optional duration slider clamped 1.8–3s
  labeled "rescales the animation", and — for `journey` only — an environment theme picker:
  coast/mountain/desert/skyline/forest). The sticky phone-frame preview renders the SELECTED
  variant with the tenant's actual logo, colors, and tagline; the design handoff's HTML prototypes
  (design/splash/, esp. Splash Variant Studio.dc.html) are the visual reference for the preview
  (web recreation — close, not pixel-perfect; label it "preview").
- Navigation Builder (P3.12) gains a "Bar style" picker: Floating Pill vs Editorial radio cards
  with a live preview of the tenant's current tabs in each style. Elevation/radius/blur are FIXED
  per-style presets — not free-form fields.
Draft -> Preview -> Publish flow as elsewhere; publish bumps the manifest version + audit row.
Tests: RBAC gating; preview reflects config changes; publish bumps manifest; invalid duration
rejected client- and server-side; typography accepts only known pairing enum values.
```
**Acceptance:** admin picks splash variant + nav style + font pairing, previews with real tenant branding, publishes; app manifest updates; no free-form font input remains.
**Commit:** `feat(admin): splash gallery + nav style picker + curated typography pairings`

### P7.3 — Mobile: 4 splash experiences (manifest-driven)
```
Use Plan mode. The high-fidelity design handoff is in design/splash/ — read README.md fully first.
Splash Variant Studio.dc.html + SplashScreen.dc.html contain the AUTHORITATIVE interpolation math
(the `progress != null` branch and the seg/eo/eio/expo/back/lerp helpers) — port to Reanimated
worklets 1:1. Timing windows, easings, and layout are final; recreate precisely.
Implement ONE <Splash variant=...> component family driven entirely by the manifest `splash`
block resolved in P4.2 (no hardcoded brand values — golden rule #5):
- Variants: journey, collection, portal, silk — shared fixed layout (safe areas, emblem slot,
  wordmark block per README), shared master clock t (one useSharedValue + withTiming linear;
  per-element worklets ease within their [start,end] windows), shared final 200ms hand-off
  (scene fade + emblem interpolates to the measured Home header slot).
- Per-variant native durations (journey 2.6s, others 2.2–2.4s); manifest animationDurationMs
  RESCALES the timeline linearly (clamp 1800–3000ms).
- journey: environmentTheme terrain (two react-native-svg Paths — animate wrapper transform only),
  bézier traveler evaluated in the worklet per the spec.
- collection: DESIGN PREREQUISITE — the logged-out/anonymous card state is not yet in the handoff
  (tier label + card number require a member). Until the design drop arrives: logged-out = generic
  brand-monogram cards, NO tier label, NO card number; logged-in shows tier label only — NEVER a
  real card number on the splash (decorative masked digits only). STOP and confirm this reading
  if ambiguous.
- portal: rings = plain Views (hairline border + static shadow); reveal via masked-view/Skia clip;
  low-end fallback = opacity + scale without mask, per the spec.
- silk: pre-blurred ribbon assets (NO runtime blur on full-width layers); emblem blur = cross-fade
  of pre-blurred vs sharp logo copies.
- Animate ONLY opacity/transform/(dashoffset); respect OS reduced-motion via the handoff's shared
  path: skip timelines, 300ms cross-fade of the final frame, navigate.
- Cold start: native bootsplash shows tenant logo on backgroundValue[1] instantly; the animated
  variant runs while manifest/Home data prefetch completes; never block on network (cached
  manifest + bundled default config so first launch is never blank). Plays once per cold start.
- Unknown/missing variant -> fall back to "silk" + log (NOT the handoff's "horizon" — horizon is
  not in MVP scope).
Storybook/dev screen: all 4 variants × light/dark × reduced-motion × (collection: logged-in/out).
Tests: interpolation helpers (pure, matched against 3-4 sampled t values per variant from the
studio); fallback on unknown enum; duration rescale clamp; reduced-motion path; no network block.
```
**Acceptance:** all 4 variants render from manifest config on iOS + Android matching the studio reference; switching variants in CMS changes the app splash with no rebuild.
**Commit:** `feat(mobile): manifest-driven splash variants (journey/collection/portal/silk)`

### P7.4 — Mobile: 2 bottom-nav styles (Floating Pill · Editorial)
```
Use Plan mode. There is NO design file for the nav styles — YOU design them, derived from the
app as it exists: the design-system tokens (design/tokens.json names via the manifest), the
current tab bar (P4.1/P4.14), and the visual language of the splash handoff (design/splash/
README.md: Marcellus/Manrope type, hairline strokes, primary-color-only glows, restrained motion).
Before implementing, present both designs for approval as a dev/Storybook screen or annotated
mock: exact dp specs (bar height, insets, radius, icon/label sizes, active treatment) per style.
Implement navigation.style as a visual-only skin over the EXISTING config-driven tab bar (P4.14).
Non-negotiables: same Option B slots, same manifest `navigation.tabs`, center Scan/Play action and
its cashless-flag fallback preserved, deep links and tab state untouched.
- floatingPill: detached pill bar, per-style fixed preset for radius/elevation; blur only where
  cheap (iOS native blur; Android uses a translucent solid — no RenderScript/heavy blur).
- editorial: classic docked bar, hairline top border, label-forward.
- Both: theme tokens only; safe-area + keyboard-avoidance correct on both platforms; active/inactive
  colors from the manifest; respect reduced motion for transitions.
- Unknown style value -> fall back to editorial + log.
Storybook/dev screen: both styles × 4/5 tabs × cashless on/off × light/dark.
Tests: fallback on unknown enum; center-action fallback still works in both styles; snapshot per
style/theme; safe-area on notch + gesture-nav devices.
```
**Acceptance:** switching `navigation.style` in CMS restyles the tab bar with no rebuild; Option B behavior identical in both styles.
**Commit:** `feat(mobile): navigation.style skins (floatingPill/editorial)`

---

# Appendix

## Suggested build order & dependencies
Phase 0 -> 1 -> 2 unlock the backend contract; generate the api-client (P2.10, re-run after P2.11-P2.13) **before** starting
the UIs. Phase 3 (admin) and Phase 4 (mobile) can then proceed in parallel by different people.
Phase 5 wires + hardens. Within a phase, keep prompts in order — later ones assume earlier models.
Phase 6 (concierge) is append-only: default is after P5.5; optionally interleave P6.1–P6.3 at any
Phase-3 pause (backend-only, additive), P6.4 after P3.11, P6.5–P6.6 after P4.4.
Phase 7 (appearance variants) is append-only: default is after Phase 6; P7.1 can run any time after
P1.5, P7.2 after P3.4/P3.12, P7.3–P7.4 after P4.2. Splash designs are in `design/splash/` (done);
nav styles are designed by Claude Code inside P7.4 (no design file — approval gate in the prompt).

## Definition of done (per prompt)
Acceptance checks pass; new code has tests; `lint + typecheck + test` green; OpenAPI + api-client
in sync; a Conventional Commit is made. Update `CLAUDE.md` if a decision changed.

## Regulated integrations — stay mock in the MVP
Keep `ADAPTER_MODE=mock`. Do NOT attempt real cardless (GLI-16), digital-key vendor SDKs, live
KYC/geo/payments, or certification inside this build — those are gated Phase-2 work (see the
analysis, Sections 5, 11, 13). The ports make the later swap a config change, not a rewrite.

## Model & workflow tips for Claude Code
- Prefer the strongest available model for Phase 1.4 (auth/RBAC), 2.4 (money), 2.8 (geofence
  engine), and the app scaffolds; use Plan mode there.
- Have Claude Code run the tests it writes and iterate to green before you commit.
- Paste one prompt at a time; verify Acceptance; commit; then continue. Don't batch phases.
- If a prompt is too big for one pass, ask Claude Code to split it into sub-tasks and proceed.

## Attaching the design file (recap)
Put the design in `design/` before P3.1 / P4.1. Figma link -> use the Figma MCP to read frames +
variables; or provide `design/tokens.json` + `design/screens/*`. Keep token **names** identical
across admin, mobile, and the tenant manifest so theming stays consistent.

## Where each golden rule shows up
- RLS tenant isolation: P1.3, and every Phase 2 module.
- Server-side authz (Permissions Matrix, Appendix C): P1.4, enforced in every route; mirrored in P3.2.
- Adapter pattern: P1.6, used by P2.3/2.4/2.6/2.7/2.8.
- Append-only money ledger + idempotency: P2.4, surfaced in P4.6.
- Manifest-driven theming: P1.5, consumed in P3.4 and P4.2.
- Consent + audit: P2.8, P2.9, P4.10.
