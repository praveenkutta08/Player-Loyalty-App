# Running the platform locally

One backend (FastAPI) + two frontends (admin console, mobile app) + Docker infra. Everything runs on
**mock adapters** (`ADAPTER_MODE=mock`) — no real hardware, payment, push, or LLM credentials needed.
Four terminals; ~15 min on a first run.

## Architecture & ports

| Piece          | Runs on                        | Notes                                             |
| -------------- | ------------------------------ | ------------------------------------------------- |
| Backend API    | `http://localhost:8000/api/v1` | OpenAPI at `/api/v1/openapi.json`, Swagger `/docs` |
| Admin console  | `http://localhost:5173`        | Vite dev; proxies `/api` → backend                |
| Mobile (Metro) | `http://localhost:8081`        | React Native bundler                              |
| Postgres       | `localhost:5433` → 5432        | user/pass/db = `player`/`player`/`player`         |
| Redis          | `localhost:6379`               | concierge cache (degrades gracefully if down)     |
| MinIO          | `:9000` API · `:9001` console  | `minioadmin`/`minioadmin`                         |
| Mailhog        | `:1025` SMTP · `:8025` UI      | dev email                                         |

## 0. Prerequisites (cross-platform)

Install per-tool with your OS package manager. **Docker Desktop, Android Studio, and Xcode are GUI
installers** (may need a reboot / license) — do those manually.

| Tool                    | Min        | Windows (winget)                                    | macOS (brew)                     | Linux (apt/dnf)                                          |
| ----------------------- | ---------- | --------------------------------------------------- | -------------------------------- | ------------------------------------------------------- |
| git                     | any        | `winget install Git.Git`                            | `brew install git`               | `apt install git`                                       |
| Node.js                 | **22.11**  | `winget install OpenJS.NodeJS.LTS`                  | `brew install node@22`           | nodesource 22                                           |
| pnpm                    | 9 (pinned) | `corepack enable`                                   | `corepack enable`                | `corepack enable`                                       |
| uv                      | latest     | `winget install astral-sh.uv`                       | `brew install uv`                | `curl -LsSf https://astral.sh/uv/install.sh \| sh`      |
| Python                  | 3.12+      | uv manages it (`.python-version` = 3.13)            | same                             | same                                                    |
| Docker Desktop / Engine | latest     | `winget install Docker.DockerDesktop` (WSL2+reboot) | Docker Desktop for Mac           | `apt install docker.io docker-compose-plugin`           |
| JDK                     | **17**     | `winget install Microsoft.OpenJDK.17`               | `brew install --cask temurin@17` | `apt install openjdk-17-jdk`                            |
| Android Studio          | latest     | `winget install Google.AndroidStudio`               | `brew install --cask android-studio` | download from developer.android.com                 |
| Xcode + CocoaPods       | —          | _(iOS = macOS only)_                                | Mac App Store + `brew install cocoapods` | n/a                                             |

- `uv` auto-provisions the pinned Python; system Python is only a fallback.
- **iOS builds require macOS.** On Windows/Linux, build Android locally and use a Mac/CI for iOS.
- Postgres/Redis/MinIO/Mailhog are **never installed directly** — Docker runs them.

## 1. One-time setup

```bash
git clone <repo> && cd <repo>
cp .env.example .env            # backend + VITE_API_BASE_URL; mock defaults work as-is
corepack enable                 # activates the pinned pnpm 9
pnpm install                    # installs all workspaces (hoisted node_modules for RN/Metro)
pnpm build                      # builds @repo/shared-types + @repo/api-client (dist/) — REQUIRED
                                # before admin/mobile can import them; also builds the admin bundle
```

## 2. Start infra (terminal 1)

```bash
pnpm infra:up                   # docker compose up -d: Postgres, Redis, MinIO, Mailhog
docker compose ps               # confirm db + redis are "healthy"
```

Only Postgres is a hard dependency; Redis is recommended (concierge caching).

## 3. Backend — migrate, seed, serve (terminal 2)

```bash
cd apps/backend
uv sync                                 # create the venv + install deps (uses .python-version)
uv run alembic upgrade head             # apply all migrations to the empty DB
uv run python -m app.seed               # seed the demo tenant — NOTE the printed tenant_id!
uv run uvicorn app.main:app --reload    # serve http://localhost:8000
```

The seed prints e.g. `Seeded demo tenant: {'tenant_id': '<UUID>', 'slug': 'demo-casino'}`.
Verify: open `http://localhost:8000/docs`.

> **Windows + Application Control:** if `uv run alembic|uvicorn|mypy` fails with "Application Control
> policy has blocked this file (os error 4551)", run the tool as a module instead:
> `uv run python -m alembic upgrade head`, `uv run python -m uvicorn app.main:app --reload`.

## 4. ⚠️ Wire the mobile app to the seeded tenant (once per fresh DB)

The demo tenant's UUID is generated by the DB, so a fresh seed produces a **new** id. Point the app
at it via a gitignored env file — **no tracked source to edit**:

```bash
cd apps/mobile
cp .env.example .env
# set TENANT_ID=<the tenant_id printed in step 3> in apps/mobile/.env
```

`buildConfig.ts` reads `TENANT_ID` (and an optional `API_HOST`) from `apps/mobile/.env` via
`react-native-dotenv`, falling back to the committed demo id when unset. Skip this on a fresh DB and
the app fetches a manifest for an unknown tenant (no branding / 404). Re-seeding an existing DB is
idempotent and keeps the same id.

> **Metro caches transforms** — after editing `.env`, restart Metro with a cache reset:
> `pnpm start --reset-cache` (env values are inlined at build time, not read at runtime).

`API_HOST` overrides the dev backend host (defaults: iOS `localhost:8000`, Android `10.0.2.2:8000`) —
handy for a physical device, e.g. `API_HOST=http://192.168.1.50:8000`.

## 5. Admin console (terminal 3)

```bash
cd apps/admin && pnpm dev        # → http://localhost:5173  (alt: pnpm --filter @repo/admin dev)
```

Log in as **super@demo-casino.com / demo-pass**. Dev uses a Vite proxy so `/api` hits the local
backend; for a deployed/non-proxy build set `VITE_API_BASE_URL`.

## 6. Mobile app (terminal 4)

Start Metro, then build to a device/emulator.

```bash
cd apps/mobile && pnpm start     # Metro bundler on :8081  (alt: pnpm --filter mobile start)
```

**Android** (Windows/macOS/Linux):

1. Point the build at the SDK — create `apps/mobile/android/local.properties` with
   `sdk.dir=<path to Android SDK>` **or** set `ANDROID_HOME` (Android Studio ▸ _Sync Project_
   generates `local.properties` for you). Ensure `JAVA_HOME` points at JDK 17.
2. Launch an emulator (Android Studio ▸ Device Manager, or `emulator -avd <name>`), or plug in a
   device with USB debugging.
3. In a new terminal: `cd apps/mobile && pnpm android` (first build downloads NDK 27 — slow once).
   The emulator reaches the backend at `10.0.2.2:8000` automatically (handled in `buildConfig.ts`).
   Physical device: `adb reverse tcp:8000 tcp:8000 && adb reverse tcp:8081 tcp:8081` (or set
   `buildConfig.apiBaseUrl` to your host LAN IP).

**iOS** (macOS only):

```bash
cd apps/mobile/ios && bundle install && bundle exec pod install && cd ..
pnpm ios                         # simulator; API base = localhost:8000
```

## 7. Login credentials (all password `demo-pass`)

| Role              | Email                       |
| ----------------- | --------------------------- |
| Super admin       | super@demo-casino.com       |
| Tenant admin      | tenantadmin@demo-casino.com |
| Account manager   | accountmgr@demo-casino.com  |
| Marketer / editor | marketer@demo-casino.com    |
| Player (VIP)      | alice@demo-casino.com       |
| Player (Gold)     | bob@demo-casino.com         |
| Player (default)  | carol@demo-casino.com       |

## 8. Everyday commands (repo root)

```bash
pnpm lint | pnpm typecheck | pnpm test | pnpm build   # turbo, all workspaces
pnpm format                                            # prettier write
pnpm gen:api                                           # regen api-client after backend API changes
pnpm check:api                                         # CI drift gate (no server needed)
cd apps/backend && uv run python -m pytest             # backend tests (needs Postgres up)
cd apps/backend && uv sync && uv run python -m pre_commit install   # enable local hooks once
```

## 9. Reset to a clean slate

```bash
pnpm infra:down && docker volume prune            # or: docker compose down -v
pnpm infra:up
cd apps/backend && uv run alembic upgrade head && uv run python -m app.seed
# → copy the NEW printed tenant_id into apps/mobile/src/config/buildConfig.ts (step 4)
```

## 10. Real (non-mock) integrations — optional

Defaults are all `mock`. To exercise the real keyless providers, set in `.env`:
`WEATHER_PROVIDER=real` (Open-Meteo), `TRAVEL_PROVIDER=real` (OSRM). For real concierge narration:
`LLM_PROVIDER=real` + `ANTHROPIC_API_KEY=…`. Backend live-API tests are opt-in:
`RUN_EXTERNAL_API_TESTS=1 uv run python -m pytest`.

## 11. Troubleshooting

- **Mobile shows no branding / manifest 404** → `TENANT_ID` in `apps/mobile/.env` doesn't match the
  seeded tenant. Fix it and restart Metro with `pnpm start --reset-cache` (step 4).
- **`@repo/api-client` / `@repo/shared-types` type or import errors** in admin/mobile → run
  `pnpm build` (their `dist/` must exist).
- **Android emulator can't reach the backend** → confirm `10.0.2.2:8000` (emulator) or use
  `adb reverse` for a physical device; backend must be on `--reload` at :8000.
- **Port 5432 already in use** → we map Postgres to host **5433**; nothing to change unless you also
  run local Postgres on 5433.
- **`pnpm install` fails mid-link on Windows (ENOENT `_tmp_`)** → a running Metro/Jest/dev process is
  holding `node_modules`; stop them and re-run (the workspace uses `node-linker=hoisted`).
- **`uv run <tool>` blocked (os error 4551)** → use `uv run python -m <tool>` (see step 3).
- **`pnpm format:check` fails on line endings** → the repo enforces LF (`.gitattributes`); let Git
  normalize or run `pnpm format`.
