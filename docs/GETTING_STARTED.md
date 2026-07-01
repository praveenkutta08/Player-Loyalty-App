# Getting Started — Building in Claude Code

How to go from this planning folder to an actual repo you build with Claude Code, with a **preflight**
that installs prerequisites (or stops and gives you steps).

---

## 1. Install Claude Code
Requires Node 18+. Install the CLI and sign in:
```
npm install -g @anthropic-ai/claude-code
claude    # run once to sign in
```
(There is also a native installer — see https://docs.claude.com/en/docs/claude-code if you prefer it.)

## 2. Turn the scaffold into your repo
1. Create an empty folder and `git init`.
2. Copy the **contents of** `starter-scaffold/` into the repo root — so `CLAUDE.md`, `apps/`,
   `packages/`, `design/`, `docker-compose.yml`, `pnpm-workspace.yaml`, `turbo.json`,
   `package.json`, `.gitignore`, `.env.example` sit at the top level.
3. Copy `PlayerApp_ClaudeCode_Build_Playbook.md` into the repo (e.g. at the root or `/docs`).
4. Copy the CMS design bundle in for reference: put `Casino Management Platform Design/` at the repo
   root (the admin prompts reference it).
5. `cp .env.example .env`.

Your repo root should look like:
```
CLAUDE.md  PlayerApp_ClaudeCode_Build_Playbook.md  docker-compose.yml  package.json
apps/ (backend, admin, mobile)   packages/   design/   Casino Management Platform Design/
```

## 3. Open the repo in Claude Code
```
cd <your-repo>
claude
```
It automatically reads `CLAUDE.md` (the golden rules) at startup.

## 4. Run the PREFLIGHT first  (this is your "stop & install" step)
Paste **P0.0 — Environment preflight** from the playbook (also copied at the bottom of this file).
It detects your OS, checks every required tool, **installs what it can**, and for anything it can't
install automatically (Docker Desktop, Android Studio, Xcode) it **stops and prints exact manual
steps**. It will not start building until your environment is ready. `CLAUDE.md` also encodes this as
a standing rule, so Claude Code keeps checking tools before each phase.

## 5. Build, one prompt at a time
Open the playbook and work through it **in order**:
- Paste **P0.1**, let Claude Code work, run the **Acceptance** checks, then **commit** (each prompt
  has a suggested commit message). Continue with P0.2, P1.1, …
- Use **Plan mode** for the big ones (P1.4 auth/RBAC, P2.4 money, P2.8 geofencing, P3.1/P3.12, P4.1).
- After **Phase 2**, regenerate `packages/api-client` **before** starting the UIs (P2.10 sets this up).
- Phases: 0 foundations → 1 backend core → 2 backend domains → 3 admin (CMS) → 4 mobile → 5 wiring.

---

## Prerequisites matrix (Windows-focused; you're on Windows)
| Tool | Min | Needed for | Install (Windows) |
|------|-----|-----------|-------------------|
| git | any | everything | `winget install Git.Git` |
| Node.js | 20 | JS/monorepo/admin/mobile | `winget install OpenJS.NodeJS.LTS` (or nvm-windows) |
| pnpm | 9 | monorepo package mgr | `corepack enable && corepack prepare pnpm@latest --activate` |
| Python | 3.12 | backend (FastAPI) | `winget install Python.Python.3.12` |
| uv | latest | Python deps | `winget install astral-sh.uv` (or `pip install uv`) |
| Docker Desktop | latest | **Postgres/Redis/MinIO/Mailhog** | `winget install Docker.DockerDesktop` → enable **WSL2** → reboot |
| JDK | 17 | Android/React Native | `winget install Microsoft.OpenJDK.17` |
| Android Studio | latest | Android build + emulator | `winget install Google.AndroidStudio` |
| React Native CLI | latest | mobile (Phase 4) | used via `pnpm dlx` / `npx` |
| Xcode + CocoaPods | — | **iOS build (macOS only)** | Mac App Store + `sudo gem install cocoapods` |

You do **not** install Postgres/Redis yourself — `docker compose up -d` runs them in containers.

## Windows notes (important)
- **Docker Desktop** needs the **WSL2** backend and a reboot; it can't be fully installed headlessly,
  so the preflight will hand you those steps.
- **Android** development works on Windows.
- **iOS** builds require **macOS** — you can't build iOS locally on Windows. Do Phases 0–3 + Android
  on Windows; for iOS use a Mac, a cloud Mac, or CI (EAS/Fastlane) later. The preflight will flag this.

## Tips
- One prompt = one change + its tests. Commit after each; keep small.
- Let Claude Code **run the tests it writes** and iterate to green before you move on.
- If a prompt is too big, ask it to split into sub-tasks.
- Keep `CLAUDE.md` authoritative — if a decision changes, update it so later prompts inherit it.

---

## P0.0 — Environment preflight (paste this into Claude Code first)
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
5. Only when all CORE tools are OK, print "Preflight passed — ready for P0.1" and STOP.
```
