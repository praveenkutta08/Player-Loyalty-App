# apps/admin — Unified Admin Console (CLAUDE.md)

One React app = tenant CMS **and** super-admin. Everything gated by RBAC; the UI mirrors the
server's permissions (which are the real guard).

## Stack & layout
- React 18 + Vite + TS + Redux Toolkit (RTK Query) + TanStack Router + Tailwind + Lucide.
- Forms: react-hook-form + zod. Maps (geofence editor): MapLibre GL. Charts: Recharts.
```
src/
  app/            store, router, providers
  api/            RTK Query base + endpoints (types from packages/api-client)
  auth/           login, token refresh, session, <Can permission> guard, tenant switcher
  components/     design-system components (from design/ tokens)
  routes/         file/route tree: super-admin/* and tenant/* areas
  features/       tenants, users-roles, branding, content, offers, promotions,
                  push, geofencing, reservations, valet, analytics, audit
```

## Rules
- Read the tenant context from the session; **super-admins** may switch/assume a tenant, and a
  scoped super-admin (Account Manager) only sees their assigned clients.
- Gate every nav item, route, and action with `<Can permission="resource:action">`; still assume
  the server enforces it.
- All data via RTK Query hooks generated from the backend OpenAPI (no ad-hoc fetch).
- Theme tokens come from the design system built from `design/`. No hard-coded colors.
- Geofence editor: drop point + radius / draw polygon / register beacons; attach an offer and a
  rule (enter/exit/dwell, threshold, schedule, frequency cap, quiet hours).

## Commands
`pnpm dev` / `pnpm build` / `pnpm test` (Vitest) / `pnpm lint` / `pnpm typecheck`.

## Design system (from the CMS handoff)
- Recreate `Casino Management Platform Design/design_handoff_casino_cms` in this stack.
- Tokens: LIGHT + DARK (`data-theme`), gold `#E6B450`; **Bodoni Moda** (display) / **Manrope** (UI) /
  **JetBrains Mono**. Use `design/tokens.json` (`color` = dark, `colorLight` = light). No hardcoded colors.
- The design's **Phosphor** icons map to **Lucide** by semantic name.
- Screens + IDs: `design/CMS_SCREEN_INVENTORY.md`. Gap analysis: `Casino Management Platform Design/CMS_PORTAL_ANALYSIS.md`.
