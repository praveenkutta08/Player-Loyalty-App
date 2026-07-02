# Architecture & Requirements Audit — Full Build Review

**Date:** 2026-07-02 · **Commit:** `a28ae9f` · **Scope:** apps/backend, apps/admin, apps/mobile, packages, infra, docs — reviewed against CLAUDE.md Golden Rules, the MVP Analysis, the Build Playbook (P0–P7), and AI_CONCIERGE_INTEGRATION.md.

**Verdict:** The architecture is sound and the golden rules are *mostly* honored — ports/adapters, RLS-with-FORCE, append-only ledger triggers, two auth audiences, OpenAPI drift check, and the concierge guardrail design are all genuinely implemented, not just claimed. But the audit found **2 Critical, 8 High** issues: a superuser DB connection that neuters RLS as a safety net, idempotency and race bugs in the money paths, an RG compliance screen that is a facade, and a white-label build story (flavors/schemes) that doesn't exist yet. All verified against source with file references.

---

## CRITICAL

### C1. App connects to Postgres as a superuser — RLS is one missed dependency away from off
- `docker-compose.yml:5` → `POSTGRES_USER: player` (the official image makes this a **superuser**); `.env.example` / `settings.py` connect as the same user. `app/db/rls.py` correctly applies `FORCE ROW LEVEL SECURITY`, but FORCE binds table *owners* — **superusers bypass RLS unconditionally**.
- Isolation currently works only because every tenant path runs `SET LOCAL ROLE app_rls` via `app/tenancy/deps.py:24-31`. Any future endpoint using bare `get_session` on a tenant table runs with zero isolation, silently. This is fail-open — the exact failure mode Golden Rule #1 exists to prevent. (No currently-exploitable endpoint found; all tenant paths do set context today.)
- **Fix:** dedicated runtime login role (`NOSUPERUSER NOBYPASSRLS`, non-owner); keep `app_rls` switching as defense-in-depth; add a startup/CI assertion that `rolsuper`/`rolbypassrls` are false.

### C2. Money-movement races: double external calls and overdraft
- `wallet/service.py` fund/transfer/cashout are check-then-act:
  - Two concurrent requests with the same Idempotency-Key both pass `_existing`, both call the cashless adapter (**external side effect twice**); the loser hits the unique constraint → unhandled IntegrityError → 500.
  - `transfer_to_egm` / `cashout` check derived balance with **no row lock** and no DB non-negative constraint — two concurrent cashouts with different keys can both pass and drive the ledger negative.
- Invisible with mocks; against a real cashless host (Phase 2 / GLI-16) this is duplicated money movement.
- **Fix:** `SELECT … FOR UPDATE` on the wallet row; insert ledger row in `pending` state *before* the adapter call (also gives crash recovery); catch IntegrityError and return the winner; DB constraint/trigger enforcing balance ≥ 0.

---

## HIGH

### H1. Idempotency key is tenant-scoped, not player-scoped — cross-player data leak
- `wallet/service.py:58-66` (verified): `_existing` matches on `(tenant_id, idempotency_key)` only and returns the record without checking `player_id`. Same pattern in `rewards/service.py:95-104`. Player B replaying player A's key receives **A's transaction** (amount, EGM id, external ref) — and the unique constraint lets B block A's key.
- **Fix:** scope lookup + unique constraint to `(tenant_id, player_id, idempotency_key)`; 409 on reuse by a different actor.

### H2. Responsible Gaming write path doesn't exist — admin RG tab is a facade with a false "audited" claim
> **RESOLVED (R6, 2026-07-03):** `PATCH /players/{id}/rg-flags` (+ lookup / rg-flagged list) gated by the new `players:rg_update` permission (super_admin + tenant_admin only), writes `audit_logs`, validated flag shapes; admin RG tab now drives it via the generated client with `<Can permission="players:rg_update">`; `dave@demo-casino.com` seeds self-excluded; concierge neutral-brief behavior covered by tests.
- Backend enforcement is real (`concierge/service.py` short-circuits flagged players before any tool/LLM call, fail-safe, tested) — but `rg_flags` is **only ever read**. No endpoint sets it. The admin Compliance ▸ RG tab (`ComplianceScreen.tsx:155,218`) is client-side `useState` with a toast claiming "Added to self-exclusion — audited" while **nothing hits the server and no audit row is written**. An operator cannot actually self-exclude a player. CLAUDE.md calls RG guardrails mandatory; playbook P3.16 is therefore materially incomplete. KYC/limits tabs are similarly local-state.
- **Fix:** permission-gated `PATCH /players/{id}/rg-flags` writing `audit_logs`; wire the tab to it; seed a flagged persona for demos.

### H3. Audit-log rule violated across most privileged/financial actions (Golden Rule #8)
- Only `wallet fund`, config/appearance PUTs, and concierge consent write audit rows. Missing: **wallet transfer & cashout**, reward redemption, digital key issue/unlock/revoke (physical access!), notification send, theme CRUD/activate, geofence CRUD, offer CRUD/publish.
- **Fix:** `write_audit` on every mutating admin endpoint and all money/key flows; consider a router-level hook so omissions fail review.

### H4. No rate limiting anywhere; 6-digit OTP brute-forceable
- No limiter in the codebase. `verify_player_otp` has no attempt counter/lockout (10-min TTL, 6 digits); admin login unthrottled.
- **Fix:** attempt cap on OTP (consume after N failures), Redis-backed rate limits on all four auth endpoints, admin lockout/backoff.

### H5. Admin refresh token in localStorage + refresh race
- `apps/admin/src/auth/tokenStore.ts:12-14` (verified): access **and refresh** tokens in localStorage — XSS exfiltrates a long-lived admin credential for a console that moves money. No CSP in `index.html`. Separately, `baseApi.ts:66-81` fires parallel refreshes on concurrent 401s; with rotation the losers 401 → spurious logout.
- **Fix:** refresh token to httpOnly cookie (backend change) or memory + strict CSP; single-flight refresh mutex.

### H6. White-label packaging doesn't exist — single-brand shell with baked-in tenant identity
- `apps/mobile/src/config/buildConfig.ts` hardcodes `tenantSlug: 'demo-casino'`, tenant UUID, API host, `appName: 'Casino Companion'`. No `productFlavors` in `android/app/build.gradle` (verified), one iOS scheme, RN-template bundle id. The runtime manifest theming is real, but there is **no mechanism to build a second tenant's binary** — the "iOS schemes / Android flavors" from CLAUDE.md are unimplemented. `assets/fonts/` is empty, so manifest-specified fonts can never render (silent system-font fallback).
- **Fix:** Android flavors + iOS xcconfigs injecting tenantId/apiBaseUrl/app_name/icons; read via native config; per-flavor font bundling.

### H7. Push permission never requested; consent state not persisted
- `push.requestPermission()` has zero callers; device token registered unconditionally after login. Android 13+/iOS will silently fail when the real adapter lands, and token-before-consent is a bad order for a regulated app. Location consent (`prefsSlice`) is memory-only — resets on cold start while server consent persists, and a failed server consent write is swallowed but the local toggle still flips (unaudited opt-in).
- **Fix:** pre-permission screen → OS prompt → register; hydrate consent from server on launch; don't flip local state on server failure.

### H8. Plaintext passcode in Keychain (biometric fallback)
- `biometricStore.ts:25-36`: the PIN is stored raw and string-compared. Mock biometrics is fine per playbook, but this design survives the mock swap.
- **Fix:** gate the refresh-token Keychain entry with `BIOMETRY_CURRENT_SET_OR_DEVICE_PASSCODE` access control; never store the raw PIN (salted hash at minimum).

---

## MEDIUM

**Backend**
- **M1. Refresh-token rotation race, no reuse-detection revocation, no logout endpoint** (`identity/service.py:67-75` — non-atomic check-then-set; stolen-token reuse doesn't revoke the family).
- **M2. Cursor pagination built but never used** — `core/pagination.py` has zero imports; every list endpoint returns capped/unbounded arrays. Violates stated convention; retrofitting later breaks the OpenAPI contract.
- **M3. OTP codes logged in plaintext** (`players/router.py:65`) with no dev-env guard.
- **M4. Suspended tenants can still authenticate players** — login/OTP and `get_current_player` never check `tenant.status` (manifest endpoint does).
- **M5. Weak dev JWT secret usable in prod** — no assertion blocking the `dev-only-…` default when `APP_ENV != dev`. Same for MinIO keys. CORS: `allow_credentials=True` + wildcard methods/headers with no prod hardening.

**Contract & consistency**
- **M6. Manifest escapes the typed contract** — `ManifestOut.theme/navigation/splash` are `dict[str, unknown]`; mobile re-types by hand in `normalize.ts` against hand-written `shared-types/manifest.ts`. The single most business-critical payload is the one the drift check can't catch. Fix: real Pydantic manifest schemas → generated types.
- **M7. Stale committed `apps/backend/openapi.json`** — ~12 paths behind (all of concierge, analytics, appearance, wallet/transactions). Delete or auto-refresh in the drift check.
- **M8. RBAC matrix duplicated Python↔TS** with only 2 spot-check tests guarding the mirror. **M9. `design/tokens.json` mirrored by hand** into mobile TS and admin CSS with no codegen/check.
- **M10. RLS test coverage is one synthetic-table test** — no cross-tenant probes through the real API on wallet/offers/players. Given it's Golden Rule #1, add parametrized tenant-A-token → tenant-B-resource tests.
- **M11. E2E suites are non-runnable scaffolds** — Playwright not a dependency of apps/admin (and the one spec's selector `link /tenants/i` doesn't match the actual "Casino Directory" nav label); Detox not installed/configured. `docs/TESTING.md` documents commands that don't exist.

**Admin**
- **M12. Demo data masquerading as features**: Members screen fakes PII with client-only "gated unmask/export" and an untrue "audited" caption; Users & Roles is display-only hardcoded admins; feature-flag screen shows invented rollout-% (backend stores booleans); default `X-Tenant` falls back to fake slug `demo-casino` and Sidebar silently substitutes demo tenants when the API errors — masking outages. Label demo surfaces or remove invented metrics.
- **M13. Forms convention (react-hook-form + zod) used only on Login** — all entity forms are hand-rolled `useState` with `disabled={!form.title}`-grade validation.
- **M14. Swallowed media-upload error** (`MediaLibraryScreen.tsx:73` — presign PUT `.catch(() => undefined)`, flow proceeds as success). Hardcoded hexes (`#E6B450` in ≥4 files) bypass the token system. No route-level code splitting (only geofencing is lazy).

**Mobile**
- **M15. Center Scan/Play fallback is dead config** — `navConfig.ts` declares `requiresFlag: 'cashless', fallback: 'wallet'` but `resolveTabs` never reads either; comments claim otherwise; the test asserts only that the fields exist. A `tabs:[{key:'home'}]` manifest renders a one-tab app (no minimum-viable-tab enforcement).
- **M16. Force-update gate (G8) unreachable** — `ForceUpdateScreen` registered, `min_app_version` never compared. A compliance kill switch that looks done and never fires.
- **M17. AskAI placement conflicts with Option B** — locked decision: AI chat under More only. Support chat complies; concierge Ask is mounted globally (TopBar on every tab + Home hero), and More has no AskAI entry. P6.6 vs Option B was silently resolved in code. **Decision needed** — either amend the IA docs or move Ask under More. (Same for the "For You" segment prepended to Offers|Promotions|My Rewards.)
- **M18. Splash variants hardcode brand-ish hexes** (`#FFF8EA`, `#2C2118`…) and nav headers hardcode Manrope regardless of manifest typography — a light-brand tenant still gets cream/dark-navy splash art.

---

## LOW (abbreviated)

`egm/pair` is a persistence-free stub; ghost migration pycache suggests a renamed applied migration (verify `alembic_version`); `derived_balance` recomputes full SUM per write with no reconciliation job; `.env.example` missing all P6 vars (`LLM_PROVIDER`, `ANTHROPIC_API_KEY`, weather/travel/cache); no rate limit or output validation on `/concierge/ask` (prompt injection can't move scores/money — verified — but can make the branded concierge say misleading things; unbounded distinct questions = unbounded LLM spend); admin Modal lacks focus trap/labels, ⌘K affordance is dead UI; promotions calendar pinned to `{year: 2026, month: 6}`; mobile manifest cache stores etag but never sends `If-None-Match`; error states indistinguishable from empty states on Offers/Wallet; no OS deep-link intent-filter (`casino://` works only via push); `analyticsApi.ts` is the one hand-written API shape (both apps); `GETTING_STARTED.md` references a nonexistent `starter-scaffold/`; stale "P3.x pending" comments; no coverage thresholds in CI; dead `useIsScopedAdmin` hook (Account-Manager scoping never surfaced in UI).

---

## What's genuinely done well

Ports & adapters is clean end-to-end (no service imports a concrete adapter; `ADAPTER_MODE` factory; contract tests). RLS is real — FORCE RLS + policies on every tenant table, tested under `app_rls`. Ledger, `audit_logs`, and `concierge_answers` immutability enforced by **DB triggers**, not convention; balances derived. Two-audience JWTs validated properly (aud + typ); RBAC re-resolved from DB per request; no admin mutating endpoint missing a permission guard; X-Tenant validated against scoped-admin allow-lists. Golden Rule #7 discipline is near-perfect in both frontends (single generated client, cache-tag invalidation, 27 of 28 API modules typed from OpenAPI). Mobile native isolation is exemplary (zero direct native imports outside `src/native`), auth storage is correct (access in memory, refresh in Keychain, single-flight refresh), manifest pipeline is cache-first with offline fallback and default-off flags. Concierge is a textbook match to its spec: deterministic scoring, LLM confined to one narration string with deterministic fallback, RG short-circuit before tools/LLM, consent-gated travel with deletion on revoke, append-only audit. CI runs lint/typecheck/test across all workspaces plus `alembic upgrade + check` against real Postgres and a dedicated api-client drift job. 117 substantive backend tests. No build artifacts in git.

---

## Recommended fix order

1. **Before any real-money or Phase 2 work:** C1 (non-superuser DB role + assertion), C2 (wallet locking + pending-row), H1 (player-scoped idempotency), H3 (audit coverage), H4 (rate limits).
2. **Compliance credibility:** H2 (real RG endpoint + audited admin tab), M4 (suspended-tenant check), M16 (force update), H7 (push/location consent flows).
3. **White-label viability:** H6 (flavors/schemes + fonts), M15 (nav fallback + minimum tabs), M18 (tokenized splash), M6 (typed manifest).
4. **Decision needed from you:** M17 — AskAI global vs under-More (update IA_NAVIGATION_PLAN.md + playbook once decided).
5. **Hygiene sweep:** M7–M14, E2E runnability (M11), Low items.
