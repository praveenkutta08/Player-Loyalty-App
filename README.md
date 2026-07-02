# Player Mobile App — Starter Scaffold + Build Playbook

This folder is a **drop-in repo skeleton** for the white-label casino player platform, plus a
sequenced set of **Claude Code prompts** that build it front-to-back and wire it together.

## Contents

- `CLAUDE.md` — the anchor doc (golden rules + conventions). Keep it at the repo root.
- `apps/{backend,admin,mobile}/CLAUDE.md` — per-app conventions.
- `docker-compose.yml`, `pnpm-workspace.yaml`, `turbo.json`, `package.json`, `.gitignore`, `.env.example`.
- `design/` — where you drop the design file (Figma link or exported tokens/screens).
- The playbook lives one level up: `../PlayerApp_ClaudeCode_Build_Playbook.md`.

## Quick start

1. `git init` a new repo and copy this scaffold in (or use it as the repo root).
2. Put the design file in `design/` (see `design/README.md`).
3. Open the repo in Claude Code.
4. Work through `PlayerApp_ClaudeCode_Build_Playbook.md` prompt by prompt, in order.
5. After each prompt: run the acceptance checks, run tests, commit.

## Local infra

`docker compose up -d` (or `pnpm infra:up`) starts Postgres, Redis, MinIO (object storage) and
Mailhog (email). Copy `.env.example` to `.env` and adjust as needed. `ADAPTER_MODE=mock` keeps all
regulated integrations mocked (the MVP default).

## Running the full stack locally

All three apps share the backend at `http://localhost:8000/api/v1`. Run each in its own terminal:

1. **Infra** — `pnpm infra:up` (Postgres :5433, Redis :6379, MinIO :9000, Mailhog :8025).
2. **Backend** — `cd apps/backend && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --reload`.
   Serves the API + OpenAPI at `http://localhost:8000/api/v1` (`/api/v1/openapi.json`). Seed the demo
   tenant per `apps/backend` docs so the mobile `buildConfig.tenantId` resolves.
3. **Admin** — `pnpm --filter admin dev` → `http://localhost:5173`. Dev uses a Vite proxy so `/api`
   hits the local backend (same-origin). For non-proxy/deployed builds set `VITE_API_BASE_URL`.
4. **Mobile** — `pnpm --filter mobile start` then `pnpm --filter mobile ios|android`. The API base
   comes from `apps/mobile/src/config/buildConfig.ts`: iOS simulator uses `localhost:8000`, the
   Android emulator uses `10.0.2.2:8000`; physical devices need the host LAN IP (set per
   scheme/flavor). Once the tenant manifest resolves it overrides the base with the tenant's own
   `endpoints.apiBaseUrl`.

## API client (OpenAPI contract)

`packages/api-client` is generated from the backend OpenAPI (GOLDEN RULE #7) — never hand-edit
`src/generated/schema.ts`.

- `pnpm gen:api` — regenerate the typed client from the FastAPI app (no running server needed).
- `pnpm check:api` — CI drift check: regenerates and fails if the committed client is stale. Run
  `pnpm gen:api` and commit whenever the API changes.

## CI & pre-commit hooks

GitHub Actions (`.github/workflows/ci.yml`) runs web lint/typecheck/test/build, the backend
lane (ruff · mypy · migration check · pytest against a clean Postgres), the OpenAPI ↔ api-client
drift check, and an Android debug-APK artifact build — see `docs/TESTING.md` for the job table.
Enable the local hooks (ruff/mypy + eslint/prettier) once:

```bash
cd apps/backend && uv sync && uv run python -m pre_commit install
```

Release/signing (fastlane) is documented in `docs/MOBILE_RELEASE.md`.
