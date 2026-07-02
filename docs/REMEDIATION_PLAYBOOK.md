# Remediation Playbook — Audit Fixes (Claude Code Prompts)

Copy-paste prompts for Claude Code to fix every issue in `docs/ARCHITECTURE_AUDIT.md`, sequenced by the audit's recommended fix order. Same rules as the build playbook: **one prompt = one focused change + its tests**, run `lint + typecheck + test` after each, commit with Conventional Commits. Every prompt assumes the CLAUDE.md golden rules. Use Plan mode for the larger ones (R1, R2, R11).

IDs map to audit findings: C = Critical, H = High, M = Medium.

---

# WAVE 1 — Money & isolation integrity (do before any real-money / Phase 2 work)

### R1 — C1: Run the app under a non-superuser, RLS-bound DB role
```
Fix audit finding C1 (docs/ARCHITECTURE_AUDIT.md). Today the backend connects to Postgres as the
`player` superuser, which BYPASSES row-level security — RLS only works because every path happens to
run `SET LOCAL ROLE app_rls`. Make isolation fail-closed at the connection level.

Do:
1. Keep the docker `player` role as DB owner/superuser for migrations only. Create a dedicated
   runtime login role `app_runtime` with LOGIN, NOSUPERUSER, NOBYPASSRLS, NO ownership of any table,
   granted only the DML the app needs on the current tables (mirror the existing grants that today go
   to `app_rls`). Add this as an Alembic migration (idempotent: CREATE ROLE IF NOT EXISTS pattern via
   DO block; grants re-runnable).
2. Point the running app at `app_runtime` (settings.py DATABASE_URL / new PG_APP_USER,PG_APP_PASSWORD;
   update .env.example and docker-compose so app services use app_runtime while the alembic/migration
   step uses player). Keep `SET LOCAL ROLE app_rls` as defense-in-depth if app_runtime still needs it,
   otherwise simplify.
3. Add a startup assertion in app lifespan: query
   `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user` and raise/refuse to boot
   if either is true (skip the check only when APP_ENV=dev AND an explicit ALLOW_SUPERUSER_DB=1 escape
   hatch is set).
4. Add a CI-runnable test that boots against Postgres as app_runtime and confirms a bare
   `get_session` SELECT on a tenant table WITHOUT setting tenant context returns ZERO rows (proves
   RLS is enforced by the role, not just by the dependency).

Acceptance: alembic upgrade head creates app_runtime; app refuses to boot as a superuser outside dev;
the new fail-closed RLS test passes; existing tests stay green. Commit: `fix(backend): run app under
non-superuser RLS-bound role (C1)`.
```

### R2 — C2: Make wallet money-movement concurrency-safe
```
Fix audit finding C2 (docs/ARCHITECTURE_AUDIT.md) in apps/backend/app/modules/wallet/service.py.
The fund/transfer_to_egm/cashout flows are check-then-act: concurrent same-key requests call the
cashless adapter twice, and concurrent cashouts can overdraft (no row lock, no non-negative
constraint).

Do:
1. Lock the wallet row for the duration of each money flow: SELECT ... FOR UPDATE on the wallet
   (extend get_or_create_wallet or add a locked variant) so per-wallet operations serialize.
2. Adopt a pending-first ledger pattern: insert the wallet_transactions row in a `pending` state
   BEFORE calling the cashless adapter, then mark it `settled`/`failed` after. This gives idempotent
   crash recovery and prevents double external side effects. (Add a status column via migration; keep
   the row immutable rule intact by allowing only the pending->settled/failed transition — implement
   the transition as an allowed update in the mutation-prevention trigger, or model settle as a new
   linked row if you prefer strict append-only. Pick one and document it in the module.)
3. Wrap the adapter call so that on unique-constraint collision (a concurrent same-key winner) you
   catch IntegrityError, re-fetch and return the winning transaction instead of 500ing.
4. Enforce balance >= 0 at the DB level (CHECK on derived balance is impractical; instead add a
   trigger or a guarded settle that re-verifies derived_balance under the row lock and rejects
   overdraft), and keep the app-level check.

Add tests: concurrent same-key fund calls the adapter exactly once and both return the same txn;
concurrent cashouts on the same wallet cannot drive balance negative; adapter failure leaves a
`failed` (or reversed) ledger row, not a phantom balance. Commit: `fix(backend): lock wallet + pending
ledger for concurrency-safe money moves (C2)`.
```

### R3 — H1: Scope idempotency keys to the player, not just the tenant
```
Fix audit finding H1 (docs/ARCHITECTURE_AUDIT.md). In apps/backend/app/modules/wallet/service.py
(_existing, ~line 58) and apps/backend/app/modules/rewards/service.py (~line 95), idempotency lookup
matches on (tenant_id, idempotency_key) only and returns the record without checking player_id — so a
player replaying another player's key receives that player's transaction.

Do:
1. Add player_id to the idempotency lookup in both services.
2. Change the DB unique constraint from (tenant_id, idempotency_key) to
   (tenant_id, player_id, idempotency_key) via an Alembic migration (drop + recreate; name it
   uq_wallet_txn_tenant_player_idem and the rewards equivalent).
3. If a key is reused by a DIFFERENT player within the same tenant, return HTTP 409 (problem+json),
   not the other player's data.

Add tests: same player + same key = idempotent replay returns their own txn; different player + same
key = 409 and no data leak. Commit: `fix(backend): player-scope idempotency keys (H1)`.
```

### R4 — H3: Write an audit_logs row for every privileged/financial action
```
Fix audit finding H3 (docs/ARCHITECTURE_AUDIT.md). Golden Rule #8 is violated: only wallet fund,
config/appearance PUTs, and concierge consent currently write audit_logs. Add audit writes to ALL
mutating admin endpoints and all money/key flows.

Do:
1. Introduce a small reusable helper/dependency (or FastAPI router-level hook) that records an
   audit_logs row with actor (admin/player id + audience), tenant_id, action, target type+id, and a
   redacted metadata blob. Prefer a mechanism that makes omission obvious in review.
2. Wire it into (at least): wallet transfer_to_egm, wallet cashout, reward redemption, digital key
   issue/unlock/revoke, notification send, theme create/update/activate/delete, geofence zone/trigger
   CRUD, offer CRUD/publish. Grep the modules for mutating routes and cover any I missed.
3. Keep audit_logs append-only (the immutability trigger already exists — don't weaken it).

Add tests asserting an audit_logs row is written for a representative money endpoint, a digital-key
action, and a theme mutation. Commit: `fix(backend): audit every privileged/financial action (H3)`.
```

### R5 — H4: Rate limiting + OTP brute-force protection
```
Fix audit finding H4 (docs/ARCHITECTURE_AUDIT.md). There is no rate limiting anywhere and the 6-digit
player OTP has no attempt cap.

Do:
1. Add Redis-backed rate limiting (the stack already has Redis 7) on all four auth endpoints:
   player login, player OTP request, player OTP verify, admin login. Use a keyed fixed/sliding window
   (per IP + per identifier). Return 429 problem+json with Retry-After.
2. Add an attempt counter on player OTP verification: after N failed attempts (e.g. 5) invalidate the
   OTP and require re-request; back off admin login on repeated failure (lockout or increasing delay).
3. Make limits configurable via settings with sane defaults; document in .env.example.

Add tests: OTP is consumed/blocked after N wrong tries; a burst of logins gets 429. Commit:
`fix(backend): rate limit auth + OTP attempt caps (H4)`.
```

---

# WAVE 2 — Compliance credibility

### R6 — H2: Real, audited Responsible-Gaming write path (and wire the admin tab)
```
Fix audit finding H2 (docs/ARCHITECTURE_AUDIT.md). RG enforcement in the concierge is real but
rg_flags is never written: the admin Compliance > Responsible Gaming tab
(apps/admin/src/features/compliance/ComplianceScreen.tsx ~155,218) is client-side useState with a
toast falsely claiming "Added to self-exclusion — audited". No endpoint sets rg_flags.

Do (backend):
1. Add a permission-gated endpoint to set/clear a player's rg_flags (e.g.
   PATCH /api/v1/players/{id}/rg-flags) requiring a compliance permission from the RBAC matrix
   (add the permission to both the Python matrix and shared-types/rbac.ts if missing). Validate flag
   values (self_exclusion, cool_off with end date, etc.); write an audit_logs row.
2. Ensure get_current_player / concierge already honor these flags (they do — don't regress).
3. Seed one flagged player persona in app/seed.py for demos.

Do (admin):
4. Replace the ComplianceScreen RG local-state mock with real RTK Query hooks against the new
   endpoint (generated api-client). Remove the false "audited" copy unless the call actually audits.
   Gate the controls with <Can permission="..."> mirroring the server permission.

Do (docs): note in docs/ARCHITECTURE_AUDIT.md that H2 is resolved.
Add tests: setting a flag requires the permission, writes audit, and makes the concierge return the
neutral brief. Commit: `fix: real audited responsible-gaming controls (H2)`.
```

### R7 — M4: Reject auth for suspended/inactive tenants
```
Fix audit finding M4 (docs/ARCHITECTURE_AUDIT.md). Player login/OTP and get_current_player never
check tenant.status, so players of a suspended tenant keep full access (the manifest endpoint already
checks status). Add an active-tenant check to player login, OTP verify, and get_current_player;
return a clear problem+json (e.g. 403 tenant_suspended). Add a test that a suspended tenant's player
cannot authenticate or call a protected route. Commit: `fix(backend): block auth for suspended
tenants (M4)`.
```

### R8 — H7 + M16: Mobile push/location consent flows and force-update gate
```
Fix audit findings H7 and M16 (docs/ARCHITECTURE_AUDIT.md) in apps/mobile.

H7 push: push.requestPermission() has zero callers and device token is registered unconditionally
after login. Add an explicit pre-permission screen -> push.requestPermission() -> only then
registerDevice(). Persist notification channel prefs (server-side via api-client, or at minimum
device storage) instead of the memory-only prefsSlice.

H7 location: consent is memory-only (resets on cold start) and a failed server consent write is
swallowed while the local toggle still flips. On launch, hydrate locationOptIn from the server; do
NOT flip local state when the server write fails (queue a retry or surface an error); keep the
existing fail-safe teardown on opt-out.

M16 force-update: nothing compares buildConfig.appVersion against the manifest's min_app_version.
After manifest resolve in ThemedRoot/RootNavigator, compare versions and route to ForceUpdateScreen
when below the floor.

Add/extend tests for the version-gate comparison and the consent-hydrate-on-launch logic. Commit:
`fix(mobile): consent-ordered push/location + force-update gate (H7,M16)`.
```

---

# WAVE 3 — White-label viability

### R9 — H6: Real per-tenant build packaging (Android flavors + iOS schemes) and fonts
```
Fix audit finding H6 (docs/ARCHITECTURE_AUDIT.md). apps/mobile is a single-brand shell:
buildConfig.ts hardcodes tenantSlug/tenantId/apiBaseUrl/appName, there are no Android productFlavors,
one iOS scheme, and assets/fonts/ is empty so manifest fonts can never render.

Do:
1. Introduce build-time tenant config injected natively rather than hardcoded literals. Add Android
   productFlavors (one per tenant, plus a `demo` default) with per-flavor applicationId suffix,
   app_name resValue, and buildConfigField for TENANT_ID / TENANT_SLUG / API_BASE_URL; add matching
   iOS schemes + xcconfig files. Read them via react-native-config (or a tiny native module) and have
   buildConfig.ts consume that instead of literals (keep a dev fallback).
2. Bundle fonts per flavor: create the font-bundling path (link fonts, react-native.config.js
   assets), add the default theme's fonts to assets/fonts, and document that manifest typography
   tokens must name a bundled font. Make DEFAULT_NAV_FONTS derive from the resolved theme, not a
   hardcoded 'Manrope' (M18-adjacent).
3. Document the "add a new tenant" steps in docs/WHITE_LABEL_CUSTOMIZATION_ROADMAP.md.

Acceptance: two flavors build with different app name / tenant id / API URL from the same JS; a
manifest-named bundled font renders. Commit: `feat(mobile): per-tenant flavors/schemes + font
bundling (H6)`.
```

### R10 — M15 + M18: Fix nav center-action fallback, minimum-tab safety, tokenized splash
```
Fix audit findings M15 and M18 (docs/ARCHITECTURE_AUDIT.md) in apps/mobile.

M15: navConfig.ts declares centerAction { requiresFlag:'cashless', fallback:'wallet' } but
resolveTabs never reads requiresFlag/fallback (KEY_TO_ROUTE maps 'play' and 'wallet' to the same
route, so the fallback is a no-op). Implement it: when the center action's requiresFlag is off, keep
the center slot but swap label/icon/screen to the wallet target. Enforce a minimum viable tab set —
if resolved tabs are fewer than the Option B set or Home is missing, fall back to DEFAULT_NAV instead
of rendering a degenerate 1-tab bar. Update the comments in MainTabs.tsx / NavBarVisual.tsx that
falsely claim this is "decided upstream".

M18: splash variants hardcode brand-ish hex values (#FFF8EA, #2C2118, etc.). Route splash colors
through theme tokens / the manifest splash config so a light-brand tenant doesn't get cream/dark-navy
art.

Extend __tests__/navConfig.test.ts to assert BEHAVIOR: cashless-off swaps center to wallet; a
partial manifest falls back to Option B. Commit: `fix(mobile): nav center fallback + min-tab safety +
tokenized splash (M15,M18)`.
```

### R11 — M6: Type the tenant manifest into the OpenAPI contract
```
Fix audit finding M6 (docs/ARCHITECTURE_AUDIT.md). ManifestOut.theme/navigation/splash are
dict[str, unknown] in the OpenAPI schema, so the single most business-critical payload escapes the
generated client — the drift check can't catch manifest shape changes, and apps/mobile re-types it by
hand in normalize.ts against hand-written shared-types/manifest.ts.

Do:
1. Model the manifest with real Pydantic v2 schemas in the backend (Theme, Navigation, Splash,
   Concierge, feature flags) so ManifestOut is fully typed. Keep tenant-tunable fields optional with
   server defaults.
2. Regenerate packages/api-client (pnpm gen:api) and run the drift check (pnpm check:api).
3. Make packages/shared-types re-export the generated manifest type (or generate it); reduce
   normalize.ts to defaulting/coercion only, dropping the `as` casts against the hand-written type.
4. Verify admin ThemeStudio/Concierge Studio and mobile ManifestProvider still typecheck.

Acceptance: manifest fields are typed in schema.ts; drift check passes; no hand-written manifest
shape remains as the source of truth. Commit: `refactor: type tenant manifest into OpenAPI contract
(M6)`.
```

---

# WAVE 4 — Decision-driven

### R12 — M17: Record the AskAI-placement decision (keep global) in the docs
```
Resolve audit finding M17 (docs/ARCHITECTURE_AUDIT.md). Decision: the concierge "Ask" surface stays
a GLOBAL entry (TopBar per tab + Home hero) per P6.6; the SUPPORT chat stays under More only per
P2.13. The code already matches this — the gap is that the IA docs still say "AI chat under More
only", creating a silent conflict.

Do (docs only, no code change unless something contradicts the decision):
1. Update design/IA_NAVIGATION_PLAN.md and docs/PlayerApp_ClaudeCode_Build_Playbook.md (and CLAUDE.md
   if it restates the rule) to distinguish: concierge Ask = global (P6.6); support chat = under More
   (P2.13). Note the "For You" segment prepended to Offers|Promotions|My Rewards is intentional
   (P6.6).
2. Add a one-line entry to docs/ARCHITECTURE_AUDIT.md marking M17 resolved with the rationale.

Commit: `docs: record concierge-Ask-global vs support-under-More IA decision (M17)`.
```

---

# WAVE 5 — Hygiene sweep (can be batched, still one commit each)

### R13 — Backend mediums: refresh rotation, pagination, OTP logging, secrets/CORS hardening
```
Fix audit findings M1, M2, M3, M5 (docs/ARCHITECTURE_AUDIT.md) in apps/backend.

M1: identity/service.py refresh rotation is non-atomic (check-then-set). Make it an atomic
`UPDATE ... WHERE revoked_at IS NULL RETURNING`; add a token family_id and revoke the whole family on
reuse detection; add a logout/revocation endpoint.
M2: core/pagination.py is built but unused. Adopt cursor pagination on the high-volume list
endpoints (audit, wallet transactions, offers, geofence zones, players) and remove unbounded/offset
returns. Regenerate api-client afterward.
M3: players/router.py logs the OTP code in plaintext — guard it behind settings.is_dev (or remove).
M5: refuse to boot with the dev JWT secret / MinIO default keys when APP_ENV != dev; assert
non-wildcard CORS origins in non-dev.

Add tests for atomic rotation + reuse revocation, cursor pagination on one endpoint, and the
non-dev secret/CORS guards. Commit one focused change at a time or a single
`fix(backend): rotation/pagination/logging/secret hardening (M1,M2,M3,M5)`.
```

### R14 — Contract & consistency: stale spec, RBAC matrix, token codegen, RLS/E2E tests
```
Fix audit findings M7, M8, M9, M10, M11 (docs/ARCHITECTURE_AUDIT.md).

M7: apps/backend/openapi.json is ~12 paths stale. Either delete it, or make scripts/regen-api-client.sh
write it as the canonical snapshot and include it in scripts/check-api-client.sh's diff + the CI job.
M8: the RBAC matrix is duplicated Python (rbac/matrix.py) <-> TS (shared-types/rbac.ts) with only 2
spot tests. Add a script/test that diffs the two matrices exhaustively in CI (export the Python
matrix to JSON and compare).
M9: design/tokens.json is mirrored by hand into apps/mobile theme TS and apps/admin tokens.css. Add a
tiny codegen (tokens.json -> TS + CSS vars) and a CI check that they're in sync.
M10: RLS coverage is one synthetic-table test. Add parametrized cross-tenant API tests: a tenant-A
admin/player token requesting tenant-B resource ids (wallet, offers, players) must get 404/empty, not
data.
M11: E2E are non-runnable scaffolds. Add @playwright/test as an apps/admin devDep with an `e2e`
script, fix the selector (nav label is "Casino Directory", not /tenants/i), add a .detoxrc for
mobile, and run each once in a workflow_dispatch CI lane so they can't rot. Fix docs/TESTING.md to
match real commands.

Commit each finding separately. Suggested first: `test(backend): cross-tenant RLS API probes (M10)`.
```

### R15 — Admin mediums: demo-data honesty, forms, upload errors, hardcoded hex, code splitting
```
Fix audit findings M12, M13, M14 (docs/ARCHITECTURE_AUDIT.md) in apps/admin.

M12: demo data masquerades as features. Add prominent "Demo / preview data" banners to (or wire real
APIs for) Members (fake PII + false "audited"), Users & Roles (display-only admins), and feature
flags (invented rollout-%; backend stores booleans — remove the % or make it real). Initialize
activeTenantId to null (not the fake 'demo-casino' slug), send no X-Tenant until real tenants load,
and replace the Sidebar demo-tenant fallback with an explicit error state.
M13: migrate entity forms (CatalogForm, CasinoWizard, ContentScreen, etc.) to react-hook-form + zod
schemas derived from generated types (currently only LoginScreen complies).
M14: MediaLibraryScreen.tsx presign PUT swallows errors (.catch(()=>undefined)) — check res.ok,
surface a toast, abort create. Replace hardcoded hexes (#E6B450 x4+) with token references. Add
route-level React.lazy code splitting in screenRegistry (only geofencing is lazy today).

Commit each finding separately. Commit: `fix(admin): honest demo data + RHF/zod forms + upload
errors + tokens (M12,M13,M14)`.
```

### R16 — Low-severity cleanup (batch)
```
Clear the LOW findings in docs/ARCHITECTURE_AUDIT.md. Address:
- egm/pair persistence-free stub — persist a pairing session or clearly mark it mock-only.
- verify the applied-migration chain matches alembic_version (a ghost pycache suggests a renamed
  applied migration) and remove stale compiled artifacts.
- add a scheduled reconciliation of wallets.balance_cents vs derived_balance.
- add all P6 vars to .env.example (LLM_PROVIDER, ANTHROPIC_API_KEY, weather/travel/cache TTLs).
- rate-limit + a cheap output post-check on /concierge/ask (reject $ amounts/percentages not present
  in context; fall back to the deterministic verdict).
- admin Modal focus trap + aria-labelledby + focus restore; remove the dead ⌘K affordance or wire it.
- promotions calendar: derive month from new Date() instead of the pinned {2026,6}.
- mobile: send If-None-Match from the manifest etag; distinct error vs empty states on Offers/Wallet;
  add a casino:// deep-link intent-filter + Linking config; move analyticsApi to generated types.
- mark docs/GETTING_STARTED.md historical (references a nonexistent starter-scaffold/) and remove
  stale "P3.x pending" comments.
- add coverage thresholds to CI.

Do these as small, separately-committed changes; keep each green. Prefix commits `chore:`/`fix:` as
appropriate and reference the finding.
```

---

## Sequencing notes
- Waves 1–2 are the release blockers (money integrity, isolation, compliance). Do them first, in order.
- R1, R2, R11 warrant Plan mode — they touch migrations / concurrency / the contract.
- Re-run `pnpm gen:api` + `pnpm check:api` after any backend change that alters routes/schemas
  (R2, R3, R4, R6, R11, R13, R14).
- After each wave, run the full suite and update the status column / resolved notes in
  `docs/ARCHITECTURE_AUDIT.md`.
