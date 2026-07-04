# Quick Start — Run the Platform Locally

Backend (FastAPI) + admin console + mobile app, all on **mock adapters** (no real credentials).
Use separate terminals for the long-running processes. Ports: API `:8000`, admin `:5173`, Metro `:8081`.

> **Windows note:** if any `uv run <tool>` fails with `Application Control policy has blocked this file (os error 4551)`, rerun it as a Python module: `uv run python -m <tool>` (e.g. `uv run python -m uvicorn …`). Applies to uvicorn, alembic, pytest, mypy.

---

## 0. One-time setup (repo root)

```powershell
# Install pnpm 9 without needing admin rights (avoids the corepack EPERM on C:\Program Files)
npm install -g pnpm@9
pnpm --version                 # must be 9.x

cp .env.example .env
pnpm install
pnpm build                     # builds @repo/shared-types + @repo/api-client dist/ — REQUIRED before the apps
```

If you prefer corepack: run `corepack enable` from an **Administrator** PowerShell once, or use `corepack pnpm@9 install` per-command.

---

## 1. Infra — terminal 1

```powershell
pnpm infra:up                  # Postgres, Redis, MinIO, Mailhog
docker compose ps              # wait for db + redis = healthy
```

---

## 2. Backend — terminal 2

```powershell
cd apps/backend
uv sync
uv run python -m alembic upgrade head
uv run python -m app.seed                       # NOTE the printed tenant_id
uv run python -m uvicorn app.main:app --reload  # → http://localhost:8000/docs
```

Verify (another terminal): `curl http://localhost:8000/api/v1/openapi.json`

The seed prints the demo `tenant_id`. If it's `3e321b81-eae9-4ece-81a1-a6d4c9a3bcfd` (the committed default) the mobile app works with no extra step. If it's different, do step 4a.

---

## 3. Admin console — terminal 3

```powershell
cd apps/admin
pnpm dev                       # → http://localhost:5173
```

**Admin login:** `super@demo-casino.com` / `demo-pass`

---

## 4. Mobile app — terminal 4

```powershell
cd apps/mobile
pnpm start --reset-cache       # Metro on :8081
# then in another terminal:
cd apps/mobile
pnpm android                   # emulator reaches backend at 10.0.2.2:8000 automatically
```

iOS (macOS only): `cd apps/mobile/ios && bundle install && bundle exec pod install && cd .. && pnpm ios`

**4a. Only if the seeded tenant_id ≠ the committed default:**
```powershell
cd apps/mobile
cp .env.example .env
# set TENANT_ID=<tenant_id printed in step 2> in apps/mobile/.env
# then restart Metro with: pnpm start --reset-cache
```

---

## 5. Login credentials (password = `demo-pass` for everyone)

**Admin console (:5173)**

| Role | Email |
| --- | --- |
| Super admin | super@demo-casino.com |
| Tenant admin | tenantadmin@demo-casino.com |
| Account manager | accountmgr@demo-casino.com |
| Marketer / editor | marketer@demo-casino.com |

**Mobile app** — email + password login (players only; admin accounts won't work here):

| Player | Email |
| --- | --- |
| VIP (best for demo) | alice@demo-casino.com |
| Gold | bob@demo-casino.com |
| Default | carol@demo-casino.com |

- Passwordless option: tap enrol/recover → enter email → the one-time code is **printed in the uvicorn terminal** (dev doesn't send email). Enter it on the OTP screen.
- After first login: biometric enrollment with a 4–6 digit passcode fallback — all mock/on-device, so any passcode works and mock biometrics always approves.

---

## 6. Reset to a clean slate

```powershell
pnpm infra:down
docker volume prune            # or: docker compose down -v
pnpm infra:up
cd apps/backend
uv run python -m alembic upgrade head
uv run python -m app.seed      # if the new tenant_id differs, redo step 4a
```

---

## 7. Common fixes

| Symptom | Fix |
| --- | --- |
| `uv run` → os error 4551 | Use `uv run python -m <tool>` |
| `corepack enable` → EPERM | `npm install -g pnpm@9`, or run corepack from an admin shell |
| Mobile shows no branding / manifest 404 | `TENANT_ID` in `apps/mobile/.env` ≠ seeded tenant → fix, then `pnpm start --reset-cache` |
| `@repo/api-client` / `@repo/shared-types` import errors | Run `pnpm build` (their `dist/` must exist) |
| Android emulator can't reach backend | Confirm backend on `:8000 --reload`; physical device: `adb reverse tcp:8000 tcp:8000 && adb reverse tcp:8081 tcp:8081` |
| Port 5432 in use | Postgres is mapped to host **5433** — no change needed |

Full reference: `docs/RUNNING.md`.
