# Player Mobile App — White-Label Casino Platform (Monorepo)

> Anchor document for Claude Code. Read this **first** and obey it in every prompt.
> Full product/architecture reference: `docs/Casino_Player_App_MVP_Analysis.docx` (keep a copy in the repo root if useful).

## What we are building
A white-label, multi-tenant platform. Casino operators (**tenants**) ship a fully branded
React Native app to their **players**. All content and theme are driven from a **unified admin
console** (tenant CMS + super-admin, gated by RBAC). Backend is **FastAPI + PostgreSQL**.
Regulated/hardware integrations (cardless play, digital key, KYC, geolocation, payments) sit
behind **adapters**; the MVP ships **mock/sandbox** adapters so everything is demoable end-to-end.

## Stack (do not deviate without being asked)
- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async) + asyncpg, Alembic, Pydantic v2,
  pydantic-settings, PostgreSQL 16, Redis 7, `uv` for deps, pytest + httpx.
- **Admin console:** React 18 + Vite + TypeScript + Redux Toolkit (RTK Query) + TanStack Router
  + Tailwind CSS + Lucide icons. Forms: react-hook-form + zod. Map: MapLibre GL.
- **Mobile:** Bare React Native (TypeScript) + React Navigation + Redux Toolkit/RTK Query.
  Native: react-native-ble-plx (BLE), beacons (iBeacon), geolocation/background-geo, Notifee +
  Firebase messaging (push), react-native-keychain (secure store), react-native-maps.
- **Monorepo:** pnpm workspaces + Turborepo. **Dev infra:** docker-compose (Postgres, Redis, MinIO, Mailhog).

## Repo layout
```
apps/backend      FastAPI service (modular monolith)
apps/admin        Unified admin console (CMS + super-admin)
apps/mobile       Bare React Native app (white-label)
packages/shared-types   Shared TS types
packages/api-client     Generated typed client from backend OpenAPI
packages/config         Shared tsconfig / eslint / prettier
design/           Drop the design file / tokens here (see design/README.md)
infra/            docker-compose, IaC, CI
```

## GOLDEN RULES — non-negotiable
1. **Tenant isolation via Postgres RLS.** Every tenant-owned table has `tenant_id NOT NULL`.
   The API sets `app.current_tenant` per request; RLS policies enforce scoping. Never rely on
   app-level `WHERE tenant_id=` alone, and never trust a client-supplied tenant id.
2. **Authorization is server-side, always.** The admin UI only *mirrors* permissions. Every
   protected route runs a permission check. Source of truth = the Permissions Matrix
   (analysis Appendix C). Hiding a button is never the only guard.
3. **Adapter (ports & adapters) pattern** for every external system: `LoyaltyPort`, `CashlessPort`,
   `DigitalKeyPort`, `KycPort`, `GeoPort`, `PaymentPort`, `PushPort`. Domain code depends only on
   the port. Implementation (mock vs real) is chosen by env (`ADAPTER_MODE`). MVP = mock/sandbox.
4. **Money is an append-only ledger.** `wallet_transactions` is immutable; balances are derived.
   All money-moving endpoints are idempotent (require `Idempotency-Key`).
5. **Manifest-driven theming.** The mobile app ships **no** brand values. It fetches a versioned
   tenant **manifest** (design tokens + feature flags + endpoints). CMS edits bump the version.
6. **Two auth audiences:** players (mobile) and admins (console) — separate tokens & claims.
7. **OpenAPI is the contract.** Regenerate `packages/api-client` whenever the API changes; admin
   and mobile consume the generated types (no hand-written request/response shapes).
8. **Consent + audit.** Location features require explicit opt-in; every privileged/financial
   action writes an immutable `audit_logs` row.

## Backend conventions
- Module = `routers/ + schemas/ + models/ + services/ + ports/`. Async everywhere.
- API base `/api/v1`; JSON snake_case; cursor pagination; RFC 7807 problem+json errors; OpenAPI tags per domain.
- Migrations via Alembic (one per change; never edit an applied migration).
- Tenancy dependency resolves tenant from JWT (mobile) / admin binding (console) / explicit
  `X-Tenant` for super-admin, then sets the RLS GUC.

## Frontend conventions
- Admin: TanStack Router route tree; RTK Query endpoints from generated client; RBAC-aware nav
  (a `<Can permission="...">` guard); theme tokens from the design system; MapLibre for geofence editor.
- Mobile: theme + feature flags from the manifest via a `ThemeProvider`/`FeatureProvider`; native
  modules isolated behind TS wrappers; white-label handled with iOS schemes / Android flavors.

## How to work
- Read this file + the relevant `apps/<app>/CLAUDE.md` before coding.
- Follow the build playbook prompts **in order**. After each prompt: run acceptance checks, run
  lint+typecheck+test, then commit (Conventional Commits). Keep OpenAPI + generated client in sync.
- Prefer small, verifiable steps and write tests with the code. Ask before adding new tech.

## Prerequisites & environment policy
Before running a prompt that needs a tool, verify it is installed and meets the minimum version.
- If missing/outdated: install via the OS package manager (winget/choco on Windows, Homebrew on
  macOS, apt/dnf on Linux) and re-verify.
- If you CANNOT install it automatically (GUI installer, reboot, admin rights, or license — e.g.
  Docker Desktop, Android Studio, Xcode): STOP, give the user exact manual steps + official links,
  and wait. Never skip, mock, or work around a missing dependency.
- Postgres/Redis/MinIO/Mailhog come from `docker-compose` — do not install them directly; only
  Docker is required.
- iOS builds require macOS; on Windows/Linux build Android locally and use a Mac/CI for iOS.
- Run the Environment Preflight (playbook **P0.0**) before P0.1.
