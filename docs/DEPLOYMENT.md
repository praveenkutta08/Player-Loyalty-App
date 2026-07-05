# Deployment — Backend + Admin (cloud) and a testable Mobile build

Goal: put the **backend API** and **admin console** on the internet, then build a **standalone
Android APK** that talks to the deployed API so you can test on a real phone. The app is on **mock
adapters**, so no real casino hardware/payment/LLM credentials are required.

> The repo now ships `apps/backend/Dockerfile`, `apps/admin/Dockerfile` (+ `nginx.conf`), and
> `.dockerignore`s. Host-agnostic — works on Render, Railway, Fly.io, or any Docker host. Concrete
> steps below use **Render** because it gives managed Postgres + Redis + Docker services in one place;
> Railway/Fly notes follow.

---

## Architecture

```
[ Android APK ]  --https-->  [ Backend API (FastAPI, Docker) ]  --->  Postgres 16 + Redis 7
[ Admin SPA (nginx) ] --https--> same Backend API (/api/v1)
```

- Backend is one Docker web service. It runs `alembic upgrade head` on boot, then serves uvicorn.
- Admin is a static SPA (built with `VITE_API_BASE_URL` pointing at the backend) served by nginx.
- Mobile talks to the backend directly; the backend URL is **baked into the APK at build time**
  (a standalone APK has the JS bundled — it can't use `adb reverse` like the emulator).

---

## Prerequisites / decisions

1. A host account (Render/Railway/Fly) and the `docker`/CLI for your choice.
2. **Secrets to generate once:**
   - `JWT_SECRET` — 32+ random bytes. `openssl rand -hex 32`.
   - `PG_APP_PASSWORD` — password for the RLS-bound runtime DB role `app_runtime` (audit C1).
   - S3 creds — any non-default values (media upload needs a real bucket to actually work, but the
     app boots as long as they aren't the literal `minioadmin`; the prod-safety guard M5 rejects that).
3. **Cookie/domain note (important):** the admin refresh token is an httpOnly **SameSite=Strict**
   cookie. If the admin and backend end up on **different registrable domains** (e.g. two different
   `*.onrender.com` subdomains are cross-site), the browser may not send the cookie and admin sessions
   won't persist across reloads. Fix: put both under one domain you own — `api.yourdomain.com` +
   `app.yourdomain.com` are same-site and work. For a quick internal test, logging in each session is
   also fine.

---

## Required backend environment variables

| Var | Value | Notes |
| --- | --- | --- |
| `APP_ENV` | `production` | Enables the M5 prod-safety guard + Secure cookies. |
| `DATABASE_URL` | `postgresql+asyncpg://OWNER:PASS@HOST:5432/DB` | The managed DB's **owner** URL (used for migrations). Note the `+asyncpg` driver. |
| `PG_APP_USER` | `app_runtime` | The non-superuser RLS-bound role the app connects as (C1). |
| `PG_APP_PASSWORD` | *(your secret)* | Must be set **at migration time and runtime** — the migration creates `app_runtime` with this password. |
| `REDIS_URL` | `redis://...:6379/0` | Concierge cache + rate limiting. Degrades gracefully if absent. |
| `JWT_SECRET` | *(your secret)* | Boot fails if left as the dev default. |
| `CORS_ORIGINS` | `https://app.yourdomain.com` | JSON list or comma value; **no `*`**, non-empty, = the admin origin. |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | *(non-default)* | Not `minioadmin`. Point at a real S3/R2 bucket for working media. |
| `ADAPTER_MODE` | `mock` | Default. Keep mock for demo. |

If the managed DB owner lacks `CREATEROLE`, the `app_runtime` migration can't create the role. Two
options: (a) use a DB user that can create roles, or (b) pre-create it once in a DB console:
`CREATE ROLE app_runtime LOGIN PASSWORD '<PG_APP_PASSWORD>' NOSUPERUSER NOBYPASSRLS;` then let
migrations grant it. Do **not** set `ALLOW_SUPERUSER_DB=1` in production — that escape hatch is dev-only.

---

## Path A — Render (recommended concrete path)

1. **Create a Postgres** (Render → New → Postgres 16). Copy its **Internal Database URL**; convert the
   scheme to `postgresql+asyncpg://...` for `DATABASE_URL`.
2. **Create a Key Value (Redis)** instance; copy its URL → `REDIS_URL`.
3. **Backend service** → New → Web Service → from your repo:
   - Runtime: **Docker**. Dockerfile path: `apps/backend/Dockerfile`. Docker build context: `apps/backend`.
   - Add all env vars from the table above. Set `PG_APP_USER=app_runtime` + your `PG_APP_PASSWORD`.
   - Deploy. First boot runs migrations. Watch logs for `assert_rls_bound_role` / M5 errors — they tell
     you exactly which env var is wrong.
4. **Seed the demo tenant** (one-off): Render → backend service → **Shell**:
   ```
   uv run python -m app.seed
   ```
   Copy the printed `tenant_id` — you'll bake it into the APK. Re-running is idempotent and now also
   flips the demo theme to dark obsidian (the backfill you added).
5. **Admin service** → New → Web Service (Docker):
   - Dockerfile: `apps/admin/Dockerfile`. Build context: **repo root** (`.`).
   - Build arg `VITE_API_BASE_URL = https://<your-backend>.onrender.com/api/v1`.
   - After it deploys, add its URL to the backend's `CORS_ORIGINS` and redeploy the backend.
6. Open the admin URL, log in `super@demo-casino.com` / `demo-pass`. (If the session doesn't persist,
   see the cookie/domain note above.)

**Railway:** same idea — two services from the two Dockerfiles, a Postgres plugin, a Redis plugin,
the same env vars; Railway injects `$PORT` which both images honor.
**Fly.io:** `fly launch` in `apps/backend` (add `fly postgres`/`fly redis`), then a second app for
admin built from `apps/admin/Dockerfile` with the `VITE_API_BASE_URL` build arg.

---

## Verify the backend is live

```
curl.exe -s https://<backend>/api/v1/openapi.json | Select-String "manifest"
curl.exe -s -H "X-Tenant: <tenant_id>" https://<backend>/api/v1/config/manifest | Select-String "mode"
```
You should see the manifest paths and `"mode":"dark"` in the theme.

---

## Build the Android APK against the deployed backend

The backend URL must be baked in at build time. Point the app at it via `apps/mobile/.env`, then build
a **release** APK (release bundles the JS, so it runs without Metro).

1. `apps/mobile/.env`:
   ```
   API_HOST=https://<your-backend>            # e.g. https://playerapp-api.onrender.com  (no /api/v1)
   TENANT_ID=<tenant_id from the seed step>
   ```
   (Per-tenant flavors can carry these instead — see the `tenant` productFlavors in
   `android/app/build.gradle` — but `.env` is the quickest for one test build.)

2. Build the release APK (debug-signed is fine for sideloading; a real keystore is only needed for the
   Play Store — see `docs/MOBILE_RELEASE.md`):
   ```
   cd apps/mobile
   pnpm start --reset-cache      # once, so env changes are picked up (env is inlined at bundle time)
   cd android
   ./gradlew assembleDemoRelease  # or the flavor you configured; Windows: .\gradlew.bat
   ```
   Output: `apps/mobile/android/app/build/outputs/apk/demo/release/app-demo-release.apk`.

   > If a release build complains about signing, it's using the debug keystore fallback for internal
   > builds — fine for sideloading. For a proper signed build follow `docs/MOBILE_RELEASE.md`.

3. **Install on a phone:** enable USB debugging, plug in, then:
   ```
   adb install -r app-demo-release.apk
   ```
   Or copy the APK to the device and tap it (allow "install from unknown sources"). No Metro needed —
   it talks straight to your deployed backend over the internet.

4. Log in as a **player**: `alice@demo-casino.com` / `demo-pass`.

---

## Gotchas checklist

- **Backend won't boot** → read the log line; the M5 guard names the offending var (JWT/S3/CORS), or
  the C1 guard means `PG_APP_USER/PG_APP_PASSWORD` aren't set to the `app_runtime` role.
- **Admin loads but every call 401/CORS-fails** → `VITE_API_BASE_URL` wasn't baked at build, or the
  admin origin isn't in `CORS_ORIGINS`.
- **Admin logs in then drops on reload** → the SameSite=Strict cookie/domain issue; use same-site
  domains.
- **APK opens but no branding / manifest 404** → `TENANT_ID` in `.env` doesn't match the seeded tenant.
- **APK can't reach backend** → it must be `https://` and publicly reachable; check `API_HOST` has no
  trailing `/api/v1` (the app appends it).
- **Media uploads fail** → expected unless `S3_*` points at a real bucket; everything else works on mock.

---

## What this does NOT set up (future)

- TLS/custom domains (host-managed), autoscaling, backups, observability.
- Real (non-mock) vendor adapters + GLI-16 (Phase 2).
- iOS device builds (macOS + Apple Developer + `docs/MOBILE_RELEASE.md`).
- Signed Play Store `.aab` release pipeline (documented in `docs/MOBILE_RELEASE.md`, not wired).
