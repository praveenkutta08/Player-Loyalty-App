# Testing & Coverage (P5.3)

Three unit/integration lanes run green in CI on every change; two E2E lanes are environment-gated
(they need a running stack or a device build) and run as separate jobs.

## Unit / integration (default CI lane)

| App     | Runner            | Command                              | Covers |
| ------- | ----------------- | ------------------------------------ | ------ |
| backend | pytest + httpx    | `cd apps/backend && uv run pytest`   | RLS isolation, authz (`require`), idempotent money, geofence dwell engine, adapter contract tests (mock), and the admin→API→app slice (`test_e2e_vertical_slice`). |
| admin   | Vitest + RTL      | `pnpm --filter admin test`           | components/hooks, RBAC `<Can>` guards, RTK Query endpoints. |
| mobile  | Jest              | `pnpm --filter mobile test`          | slices, RTK Query builders, and pure logic — money, deep-links, dwell tracker, nearest-zone, redeem outcomes, config-driven nav, biometric gating. |

Run everything from the root: `pnpm test` (Turbo fans out across workspaces).

## Coverage

- **backend:** `cd apps/backend && uv run pytest --cov` (config in `pyproject.toml` — `app/` source,
  seed + migrations omitted; missing lines shown).
- **mobile:** `pnpm --filter mobile test:coverage` (`collectCoverageFrom` targets logic units, not
  presentational screens/navigators).
- **admin:** `pnpm --filter admin test -- --coverage` (needs `@vitest/coverage-v8`).

## End-to-end (gated jobs)

Both live outside the default runners (Jest ignores `e2e/`; Vitest excludes `e2e/**`; the folders are
excluded from typecheck/lint) because they require infra a device/CI runner must provision.

### Admin — Playwright (`apps/admin/e2e/provision-and-publish.spec.ts`)

Critical path: **login → provision tenant → publish offer**.

```bash
pnpm add -D @playwright/test        # once
npx playwright install              # browsers
# start infra + backend + `pnpm --filter admin dev`, then:
pnpm --filter admin exec playwright test
```

### Mobile — Detox (`apps/mobile/e2e/appFlow.e2e.ts`)

Critical path: **auth → offers → wallet(mock) → geofence dwell(sim)**, driven by the screens'
existing `testID`s.

```bash
pnpm add -D detox                   # once
detox build -c ios.sim.debug        # native build (needs Xcode/Android Studio)
detox test -c ios.sim.debug
```

## CI (implemented — `.github/workflows/ci.yml`)

Four jobs on every push to `main` / PR:

| Job          | What it runs                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `web`        | `pnpm format:check` → `lint` → `typecheck` → `test` → `build`; uploads the admin `dist/` artifact         |
| `backend`    | `ruff` → `mypy` → `alembic upgrade head` (clean `postgres:16` service) → `alembic check` → `pytest`       |
| `api-client` | `scripts/check-api-client.sh` — OpenAPI ↔ generated client drift (GOLDEN RULE #7; no DB needed)          |
| `android`    | Debug-APK artifact build (skipped on PRs — runs on `main` pushes + manual dispatch)                       |

Playwright/Detox E2E stay opt-in per the section above (device/browser infra). Release/signing
builds are a later phase — see `docs/MOBILE_RELEASE.md` (fastlane).

## Pre-commit hooks (implemented — `.pre-commit-config.yaml`)

`ruff` + `mypy` (backend, uv-locked) and `eslint` + `prettier` (workspaces, pnpm-locked) run on
every commit. Install once:

```bash
cd apps/backend && uv sync && uv run python -m pre_commit install
```
