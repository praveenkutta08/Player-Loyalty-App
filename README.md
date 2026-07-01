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
`docker compose up -d` starts Postgres, Redis, MinIO (object storage) and Mailhog (email).
Copy `.env.example` to `.env` and adjust as needed. `ADAPTER_MODE=mock` keeps all regulated
integrations mocked (the MVP default).
