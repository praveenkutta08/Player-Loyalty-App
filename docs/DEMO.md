# End-to-End Demo Script

A repeatable ~10-minute walkthrough of the white-label platform: provision + brand a tenant in the
admin, publish content, then run the full player experience on device — cardless play, digital key,
games, rewards, and the geofence dwell promo. Everything runs on **mock adapters** (`ADAPTER_MODE=mock`),
so no real hardware, payment, or push credentials are needed.

## 0. Prerequisites & seed

1. **Infra + backend + apps** — follow the README "Running the full stack locally":
   `pnpm infra:up`, run the backend, `pnpm --filter admin dev`, and `pnpm --filter mobile ios|android`.
2. **Seed the demo tenant** (idempotent — safe to re-run):
   ```bash
   cd apps/backend && uv run python -m app.seed
   # → Seeded demo tenant: {'tenant_id': '<UUID>', 'slug': 'demo-casino'}
   ```
   The seed creates: the **Demo Casino** tenant; admins; players; a published Welcome Offer +
   promotion; a confirmed **hotel reservation for alice**; the **Steakhouse** zone with a 10-minute
   **dwell** trigger; a **jackpot** game; and **rewards** (Branded Cap 100 pts, Steakhouse Dinner
   500 pts).
3. **Point the app at the seeded tenant** — copy the printed `tenant_id` into
   `apps/mobile/src/config/buildConfig.ts` (`tenantId`) so the app fetches the right manifest, then
   reload the app.

### Credentials (all password `demo-pass`)

| Who              | Login                        | Use                              |
| ---------------- | ---------------------------- | -------------------------------- |
| Super admin      | `super@demo-casino.com`      | provision + brand + publish      |
| Player (VIP)     | `alice@demo-casino.com`      | full player demo (hotel + points)|

### Reset

Re-running the seed is idempotent. For a clean slate: `pnpm infra:down && docker volume prune` then
`pnpm infra:up`, re-run migrations (`uv run alembic upgrade head`) and the seed.

---

## Act 1 — Provision a tenant (admin)

1. Log in to the admin (`http://localhost:5173`) as **super@demo-casino.com**.
2. **Tenants → New tenant** — create one (or use the seeded **Demo Casino**). Note it appears in the
   tenant switcher; RBAC scopes what each admin role can see.

## Act 2 — Theme it live (admin → app, no rebuild)

1. In **Branding**, change the tenant's **gold/primary** token to a distinctly different color and
   **Publish** (this bumps the manifest version).
2. On the phone, pull-to-refresh Home (or background → foreground).
3. **Expect:** the brand color updates across buttons, the center Scan/Play tab, and cards — **no
   rebuild**. (This is the manifest-driven theming promise, GOLDEN RULE #5.)

## Act 3 — Publish an offer + send a push (admin)

1. **Offers → New offer** (segment `all`) → **Publish**.
2. In the app **Offers** tab, refresh → the offer appears; open it and **Redeem** (idempotent — a
   retry never double-redeems).
3. **Push → compose** a notification with a deep link to that offer
   (`{ "type": "offer", "id": "<offer id>" }`) → **Send**.
4. In the app, open the notification from the **bell → Notifications** center; tapping it deep-links
   into the Offers tab.

## Act 4 — Cardless play + digital key (mock)

**Cardless (S1–S9):**
1. Tap the center **Scan/Play** tab → **Find nearby machines** (simulated BLE peripheral) → pick a
   machine to pair (or **Scan QR** → *Simulate scan* as the fallback).
2. On the machine session, **Transfer to machine** — first **Deposit** into the wallet (mock
   payment method), then transfer. Watch the balance + active credits update; every move is
   idempotency-keyed with clear pending/success states.
3. **Cash out** back to the wallet; check **History** for the ledger entries.

**Digital key (C14):** as **alice** (she has a confirmed hotel stay):
1. **More → Digital key → Issue key** (server only issues for a confirmed hotel reservation).
2. **Hold near door to unlock** — the on-device SDK stub handshakes, the backend authorizes, and the
   key shows **Unlocked** (or a clear denied/error state).

## Act 5 — Games, rewards, and the geofence dwell promo

**Games (C5/C8/C9):** **More → Games** — search titles, filter **All/Slots/Tables**, see the
**Jackpot of the day**, favorite a game (heart), and open the **Leaderboard** to see alice's rank.

**Rewards (C6/C7/O5):** **Offers → My Rewards → Browse rewards** → open **Branded Cap** (100 pts) →
**Redeem**. The balance updates; **My Rewards** shows the redemption + tier progress ("X pts to next
tier"). Try **Steakhouse Dinner** (500 pts) to see the *insufficient points* state.

**Geofence dwell promo (the headline demo):**
1. **More → Nearby → Set up location → Enable location** (explicit, purpose-first consent).
2. On the **Steakhouse** zone, tap **Simulate 10-min dwell**. The dwell tracker fires exactly once,
   posts a `/geo/events` dwell, and the server trigger engine returns the promo.
3. **Expect:** an **"Offer sent"** confirmation and **exactly one** promo in the **Notifications**
   center — honoring consent, quiet hours, and the frequency cap.

---

## What this proves

One codebase, driven entirely by a tenant **manifest** + **mock adapters**, delivers a fully branded
player app end-to-end: live re-theming, published content, cardless play, digital key, games,
rewards, and location-triggered offers — with tenant isolation (RLS), server-side authorization, an
append-only money ledger, and consent/audit throughout. Swap `ADAPTER_MODE` to wire real
integrations behind the same ports.
