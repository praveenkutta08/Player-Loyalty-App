# @repo/admin — Unified Admin Console

React 18 + Vite + TypeScript + Redux Toolkit (RTK Query) + TanStack Router + Tailwind. One app
serves the tenant CMS **and** super-admin, gated by RBAC that mirrors the backend Permissions
Matrix. See [CLAUDE.md](./CLAUDE.md) for conventions.

## Running locally

The console talks to the FastAPI backend at `/api/v1` (the Vite dev server proxies `/api` →
`http://localhost:8000`). To log in you need the backend + database running.

### 1. Start dev infra (Postgres, Redis, MinIO, Mailhog)

From the repo root — requires **Docker Desktop** running:

```bash
pnpm infra:up            # docker compose up -d
```

> Postgres is published on host port **5433** (a native Postgres often occupies 5432); the
> backend's `DATABASE_URL` already points there.

### 2. Migrate + seed + start the backend

```bash
cd apps/backend
uv run alembic upgrade head          # apply migrations (first run only)
uv run python -m app.seed            # idempotent demo data (tenant, admins, offers, …)
uv run uvicorn app.main:app --reload --port 8000
```

Sanity check (should print `200`):

```bash
curl http://localhost:8000/api/v1/openapi.json -o /dev/null -w "%{http_code}\n"
```

### 3. Start the admin console

From the repo root, in a second terminal:

```bash
pnpm --filter @repo/admin dev
```

Open **http://localhost:5173**.

### 4. Log in (demo accounts)

Password for all: **`demo-pass`**

| Email                         | Role              | Sees                             |
| ----------------------------- | ----------------- | -------------------------------- |
| `super@demo-casino.com`       | Super-Admin       | Platform scope, all casinos      |
| `accountmgr@demo-casino.com`  | Account Manager   | Only assigned casinos (scoped)   |
| `tenantadmin@demo-casino.com` | Tenant Admin      | Single tenant                    |
| `marketer@demo-casino.com`    | Marketer / Editor | Limited nav (no Casinos/Members) |

> Demo accounts use the `demo-casino.com` domain on purpose: Pydantic's `EmailStr`
> (email-validator) rejects reserved TLDs such as `.test`, `.example`, `.localhost` and even
> `example.com`, which would fail login validation with a 422.

## What to try

- Topbar **Platform | Casino** toggle swaps the nav set + acting scope and resets to Dashboard.
- **Theme toggle** (sun/moon) flips light/dark; all colors come from the token layer.
- Sign in as different roles to see **RBAC** hide/disable nav items and actions (the server also
  enforces every check — hiding a button is never the only guard).
- **Casinos → open a property** loads that tenant's live feature flags; **Theme → Publish** bumps
  the tenant manifest; **Content / Offers / Promotions / Geofencing / Rewards / Games** do real
  CRUD against the acting tenant (sent as the `X-Tenant` header).

## Scripts

| Command                               | Purpose                       |
| ------------------------------------- | ----------------------------- |
| `pnpm --filter @repo/admin dev`       | Vite dev server (port 5173)   |
| `pnpm --filter @repo/admin build`     | Type-check + production build |
| `pnpm --filter @repo/admin preview`   | Serve the production build    |
| `pnpm --filter @repo/admin test`      | Vitest unit tests             |
| `pnpm --filter @repo/admin lint`      | ESLint                        |
| `pnpm --filter @repo/admin typecheck` | `tsc --noEmit`                |

## Troubleshooting

- **`WinError 10013` / port 8000 in use** — a previous uvicorn is still bound. Find and stop it:
  `Get-NetTCPConnection -LocalPort 8000` → `Stop-Process -Id <pid> -Force`. Or run uvicorn on a
  different port and update the proxy `target` in [vite.config.ts](./vite.config.ts).
- **Login returns 422** — the email failed validation (reserved TLD); use a `demo-casino.com`
  account above.
- **Login returns 401** — wrong password; it's `demo-pass`.
- **Blank data / network errors after login** — the backend isn't running or wasn't seeded; redo
  steps 2.
- **`pnpm infra:up` fails** — start Docker Desktop first.
