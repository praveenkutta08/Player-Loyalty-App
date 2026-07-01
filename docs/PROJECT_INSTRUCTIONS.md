# Player Mobile App — Project Instructions
(Paste the block below into the project's Instructions field in the Claude desktop app.
Keep it short and durable; update the "Decisions locked" list as things change. No secrets.)

---

Project: Player Mobile App — a white-label, multi-tenant casino player platform.
Casino operators (tenants) ship a branded React Native app to players; all content/theme is
controlled from a unified admin console (CMS + super-admin, RBAC); backend is FastAPI + PostgreSQL.
Regulated/hardware integrations (cardless play, digital key, KYC, geolocation, payments) sit behind
adapters and are MOCKED for the MVP.

Stack: FastAPI (Python 3.12, SQLAlchemy 2.0 async, Alembic, Postgres 16, Redis); admin console =
React + Vite + TypeScript + Redux Toolkit + TanStack Router + Tailwind + Lucide; mobile = bare
React Native (TypeScript); monorepo = pnpm + Turborepo.

Decisions already locked (don't reopen unless I ask):
- Tenant isolation via Postgres RLS; authorization enforced server-side; ports/adapters pattern for
  all external systems; append-only wallet ledger; manifest-driven theming AND navigation; separate
  player vs admin auth audiences.
- MVP keeps cardless, digital key, KYC, geo, and payments mocked; real vendors + GLI-16
  certification are Phase 2.
- One unified admin app (not two); a super-admin can be scoped to specific tenants (Account Manager).
- Mobile nav = Option B: Home · Offers (Offers|Promotions|My Rewards) · center Scan/Play · Account ·
  More. AI Chat is support-only, under More.

Key files in this folder:
- docs/Casino_Player_App_MVP_Analysis.docx — architecture & scope reference.
- docs/PlayerApp_ClaudeCode_Build_Playbook.md — 60 sequenced Claude Code prompts (Phases 0-5).
- Repo root — CLAUDE.md golden rules, apps/, packages/, and design/ (tokens.json,
  SCREEN_INVENTORY.md, IA_NAVIGATION_PLAN.md, sitemap + flow diagrams).

How to work with me here:
- Be concise and direct; minimal formatting.
- Save deliverables into this folder and show them as file cards; keep diagrams as PNGs.
- When a decision changes, UPDATE the affected doc (analysis / playbook / design), don't just chat it.
- Keep new work consistent with the golden rules and the Option B IA; tie back to the analysis + playbook.
- Terminology: "CMS Portal" = our content admin; "Casino Management System (CMP)" = the casino floor/
  EGM system. The Obsidian / "Executive Companion" design is a SAMPLE; real branding is per tenant.
