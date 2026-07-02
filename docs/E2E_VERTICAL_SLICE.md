# End-to-End Vertical Slice (P5.2)

Proves the core promise — **admin change → API → app, live** — on the seeded demo tenant. The
API-boundary half is automated in `apps/backend/tests/test_e2e_vertical_slice.py`
(`test_theme_offer_and_push_flow_admin_to_app`); this checklist covers the on-device half that
needs eyes on a running app.

## Prerequisites

1. `pnpm infra:up` and run the backend (`uv run uvicorn app.main:app --reload`) — see the README
   "Running the full stack locally".
2. Seed the demo tenant so `apps/mobile/src/config/buildConfig.ts` `tenantId` resolves.
3. Admin console: `pnpm --filter admin dev` (log in as the seeded super-admin).
4. Mobile: `pnpm --filter mobile ios` (or `android`), log in as a seeded demo player.

## 1. Live re-theme (manifest, no rebuild)

- [ ] In admin **Branding**, change the tenant's primary/gold token (e.g. to a distinct color) and
      **publish** (this bumps the manifest version).
- [ ] In the app, pull-to-refresh Home (or background/foreground) to re-fetch `/config/manifest`.
- [ ] **Expect:** brand color updates across the app (buttons, tab center action, cards) with **no
      rebuild**. The manifest `version` increases; the ETag changes.

## 2. Publish an offer → appears + redeems

- [ ] In admin **Offers**, create an offer (segment `all`) and **publish** it.
- [ ] In the app **Offers** tab, refresh — the offer appears.
- [ ] Open it and **Redeem**.
- [ ] **Expect:** redemption confirmation; redeeming again is idempotent (no double redemption).

## 3. Send a push → deep link opens the right screen

- [ ] In admin **Push**, compose a notification with a deep link to the published offer
      (`{ "type": "offer", "id": "<offer id>" }`) and **send**.
- [ ] In the app, open the notification (or simulate via the dev push hook) from the notification
      center / banner.
- [ ] **Expect:** delivery is recorded in admin; tapping the notification deep-links into the Offers
      tab (offer segment). (Deep-link resolution is unit-tested in
      `apps/mobile/__tests__/notifications.test.ts`.)

## What's automated vs. manual

| Flow  | Automated (pytest, API boundary)                         | Manual (on device)                  |
| ----- | -------------------------------------------------------- | ----------------------------------- |
| Theme | manifest theme tokens + version bump after admin edit    | colors actually re-render in the app |
| Offer | publish → visible in `/app/offers` → idempotent redeem   | redemption UI + confirmation        |
| Push  | compose stores deep link → send delivers to device       | notification tap navigates via deep link |
