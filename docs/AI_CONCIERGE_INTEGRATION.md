# AI Concierge Integration Plan — "Agentic Concierge" track

> How the agentic-AI concierge requirement (MCP-driven patron recommendations) integrates with the
> existing white-label platform — without interrupting the playbook prompts Claude Code is executing.
> Companion inputs: the requirement brief + `design-mentor-notes.md` ("Luminara" mentor notes).
> Decisions taken 2026-07-02 (Sridhar): concierge embedded in Home + assistant opens from Home;
> free real APIs (Open-Meteo, OSRM) behind ports with mock fallback; playbook updated append-only.

---

## 1. What this requirement actually is

Not a chatbot. It's three layers, and chat is the smallest one:

1. **A recommendation system** — deterministic, server-side scoring: visit-fit score, offer ranking,
   itinerary assembly. This is where the business value lives.
2. **An orchestration layer** — MCP-style tools over internal data (player, offers, loyalty, trips)
   plus external context (weather, travel time). The agent composes tools; it does not compute.
3. **A presentation layer** — answers-first UX: verdict sentence + "why you" reasons + source chips
   on Home and Offers, with a chat surface as the fallback for open-ended questions.

The mentor notes' sharpest line is the right north star: *if offer CTR and answer acceptance move,
you have a product; if not, you have a prettier chatbot.*

## 2. Why this fits our architecture almost perfectly

The MCP concept **is** our golden rule #3 (ports & adapters) wearing a different name. We already
run every external system behind a typed port with mock/real selected by env. Mapping:

| Requirement asks for | We already have | Gap |
|---|---|---|
| Internal MCP: player profile, tier, offers, activity, favorites, trips | P2.2 offers + redemption ledger, P2.3 account/loyalty via LoyaltyPort, P2.5 reservations, P2.11 favorites, P2.12 rewards — all built, tenant-scoped (RLS) | Thin **tool registry** exposing these as typed tools |
| Player value / worth / ADT | LoyaltyPort (points, tier, activity) | Extend LoyaltyPort: `get_player_value()` (mock personas) |
| External MCP: weather, drive time, traffic | Port pattern + Redis + adapter contract tests | New **WeatherPort**, **TravelPort** |
| AI answering with guardrails | P2.13 ChatPort (support chat), audit logs, consent flags, RG module | New **concierge orchestrator** + per-use-case prompts |
| Nearby properties comparison | Tenant model | New `properties` table (lat/lng, amenities) |
| 3-screen mobile UX | Option B nav, manifest-driven theming/nav, Home recommendations slot (H1) | Concierge components + Ask AI screen |

So this is an **additive module**, not an architecture change. That's the core finding.

### MCP now vs. MCP later
For the MVP, do **MCP-shaped, not MCP-protocol**: an in-process tool registry inside the backend
where every tool has a name, JSON-schema args, and a typed result — exactly the MCP tool contract —
but invoked as Python calls by our orchestrator. Reasons: no extra network hop, RLS + tenant GUC
stay inside one request context, and the LLM is mocked in MVP anyway. Because tool signatures mirror
MCP, lifting them into a real MCP server in Phase 2 (for external agent access or vendor interop) is
a transport change, not a redesign. The **source chips still work** — the orchestrator reports which
tools it called (`player-mcp · offers-mcp · weather-mcp · maps-mcp`) regardless of transport.

## 3. Mentor notes: adopt / adapt / reject

**Adopt as-is** (these are good and cost us nothing):
- Answers-first screens; verdict → evidence → CTA schema.
- "Why you" reasoning on every recommendation; source chips on every AI answer.
- Server-side offer ranking — the AI consumes ~10 pre-ranked offers, never re-ranks 200.
- Orchestrator pattern: plan tools → call in parallel → structured results → LLM narrates → return
  answer + tools-called list.
- One system prompt per use case; temp 0.3 verdicts / 0.7 chat; never invent terms; degrade
  gracefully ("couldn't reach maps — here's what I know without it").
- Caching + prefetch: weather 30 min, travel 5 min, answer cache per (player, use_case,
  context_hash) ~5 min; prefetch the Home brief during splash/manifest resolve. Spinner on Home =
  product failure.
- The nine-component UI kit (RecoHero, WhyYouPill, OfferCard, SourceChip, SignalTile, AIAnswerCard,
  ContextStrip, orb, Screen wrapper).
- The metrics list (§9 below) and the 90-second demo script shape.
- Don't wire voice; don't build a generic ChatGPT tab.

**Adapt** (right idea, wrong context — we're a white-label multi-tenant platform, not a one-brand app):
- **"Luminara / Aria / Twilight Concierge" is a sample tenant theme**, exactly like the Obsidian
  sample. Fraunces/Geist/amber palette, grain texture, orb — all expressible as manifest design
  tokens + assets. The concierge **persona name, tone, and orb accent are tenant-configurable in the
  CMS** (a tenant may call it "Ruby" with their own accent color). Nothing hardcoded in the app —
  golden rule #5.
- **4-tab IA → keep Option B (5 tabs), embed the concierge.** Decided: the hero card on Home IS the
  concierge ("Should I visit?" verdict), Offers gets a ranked **For You** treatment, and a full
  **Ask AI** screen opens from the Home hero + a global entry. Support chat stays under More ▸
  Support, unchanged. Because nav is manifest-driven, a concierge-forward tenant can still ship the
  mentor's 4-tab layout as **config** — that's a selling point, not a conflict.
- **"Don't build a CMS first"** — moot; ours exists and is mid-build. Instead the CMS gets a small
  **Concierge Studio** page: enable flag, persona, scoring weights, guardrails, preview.
- **"Hardcode player personas"** — mock at the **adapter layer** (LoyaltyPort mock returns regional
  commuter / weekend destination / high-value local personas), not in client code. Same demo effect,
  keeps golden rule #3 and the later CMP swap clean.

**Reject** (would violate locked decisions for no MVP gain):
- **Expo / expo-router / nativewind / zustand.** We are locked on bare RN + React Navigation + RTK
  for hard reasons: BLE (react-native-ble-plx), beacons, background geo, Keychain, and white-label
  iOS schemes / Android flavors — several of these are exactly why bare RN was chosen. The mentor's
  stack advice targets a greenfield standalone demo. Adopt the *design system and components*, not
  the stack.
- **"Skip admin, seed a JSON file."** Multi-tenant platform; seeds already exist (P2.10). We extend
  the seed, we don't fork a parallel data path.

**What the mentor missed** (and we cannot):
- **Responsible gaming.** An AI that proactively says "it's a great day to visit the casino" is a
  marketing communication aimed at inducing gambling. Server-side guardrails, non-negotiable:
  players with self-exclusion, cool-off, or limit flags get **no proactive visit nudges** (Home
  falls back to neutral content); quiet hours + frequency caps reuse the P2.8 trigger-engine
  concepts; the small-type advisory disclaimer sits below the hero (mentor is right: no modal).
- **Consent.** Drive-time needs a stored home/origin location — a **separate explicit consent**
  from the existing location_consent, set during onboarding (A7) or on first "Should I visit?" use,
  with graceful degradation (no origin → skip travel_fit, say so).
- **Audit.** Every AI answer writes an audit/analytics row: inputs hash, tools called, scores,
  output, player, tenant. Golden rule #8, and it's also your eval dataset later.
- **Tenant isolation.** All tools execute under the caller's RLS context; the LLM never sees
  another tenant's data by construction.

## 4. Backend architecture

New module `app/modules/concierge/` (models + schemas + services + router), two new ports.

```
mobile ──> /api/v1/concierge/*  (player JWT, RLS tenant context)
              │
              ▼
        Orchestrator (per use case: plan → call tools in parallel → score → narrate)
              │
   ┌──────────┼──────────────┬───────────────┐
   ▼          ▼              ▼               ▼
 tool registry (internal)  WeatherPort    TravelPort        LlmPort
 player-mcp / offers-mcp   Open-Meteo     OSRM/haversine    mock scripted (MVP)
 wraps P2 services         (no key) or    or Google DM      real provider by env
 under RLS                 mock           or mock
              │
              ▼
        Redis cache (weather 30m · travel 5m · answers 5m) + audit/analytics rows
```

**Ports** (`ADAPTER_MODE` selected, contract-tested like the rest):
- `WeatherPort.get_forecast(lat, lng, days)` — real: Open-Meteo (free, keyless); mock: deterministic
  generator (seeded by date) so tests/offline demos are stable.
- `TravelPort.get_travel_time(origin, dest, depart_at)` + `get_traffic_window(origin, dest, range)` —
  real: OSRM public/haversine-with-speed-model; Google Distance Matrix is a Phase-2 adapter swap;
  mock: distance/55mph with rush-hour multipliers.
- `LlmPort.complete(system, messages, tools?)` — mock: template/scripted narrations from the
  structured scores (demoable offline, zero cost); real: Claude via env. Keep P2.13 ChatPort as-is
  for support; concierge gets its own port (different guardrails, different audience of prompts).

**Endpoints** (player audience, additive to OpenAPI → api-client regen is additive):
- `GET  /concierge/brief?horizon=today|weekend` — use case 1; returns the Home hero payload.
- `GET  /concierge/offers` — use case 2; top 5–10 ranked offers each with `why_you` + reasons.
- `POST /concierge/plan` — use case 3; itinerary (leave time, first stop, offer order, dinner).
- `POST /concierge/ask` + `GET /concierge/history` — free-form chat, answers rendered as
  signal cards + source chips, never plain prose walls.

**Response envelope** (uniform, so mobile renders one way):
```json
{ "verdict": "It's a great day to visit Cascade.",
  "fit_score": 82, "confidence": "high",
  "reasons": [{"chip": "3 offers expiring", "detail": "...", "source": "offers-mcp"}, ...],
  "signals": [{"label": "Drive", "value": "48 min", "delta": "-12 vs usual", "source": "maps-mcp"}],
  "sources": ["player-mcp", "offers-mcp", "weather-mcp", "maps-mcp"],
  "cta": {"label": "Plan my visit", "action": "concierge.plan"},
  "disclaimer": "Recommendations are advisory.", "generated_at": "...", "cache_ttl_s": 300 }
```

**Scoring (deterministic service, unit-tested; LLM narrates, never computes):**
- `visit_fit = w1·value_at_risk + w2·weather_fit + w3·travel_fit + w4·tier_urgency` (0–100).
- `offer_score = relevance × urgency × feasibility_today`.
- Weights live in tenant config, editable in Concierge Studio, versioned in the manifest.

**Data model additions:**
- `properties` (tenant-scoped: name, lat/lng, amenities, status) — enables drive time + use case 3
  and later the multi-property comparison (use case "which property").
- `players.home_origin` (nullable point/zip) + `players.concierge_consent` (bool, default false).
- `player_preferences` (favorite property / dining / experiences; game favorites already exist).
- LoyaltyPort extension: `get_player_value()` → worth band, ADT, visit frequency, recent visit gap
  (mock personas in MVP; real = CMP adapter in Phase 2).
- `concierge_answers` (append-only: use case, inputs hash, tools called, scores, output, ts) — audit
  + the metrics source.

## 5. Admin (CMS Portal) integration

One new screen, **Concierge Studio** (fits the existing P3 patterns, permission-gated):
enable/disable per tenant (manifest flag), persona (name, tone, orb accent token), scoring weights
with live preview against a seed player, guardrail settings (quiet hours, frequency cap, RG policy
is enforced-on and visible but not disable-able), and prompt/knowledge overrides. Publishing bumps
the manifest version like everything else.

## 6. Mobile integration (Option B, decided placement)

- **Home (H1)** — the existing "recommendations" slot becomes the **concierge hero**: verdict +
  fit score + 3–4 reason chips + CTA ("Plan my visit"). Context strip (weather · drive · traffic)
  under it. Prefetched during splash. Flag off → today's static recommendations, no dead ends.
- **Offers tab** — segmented control gains a **For You** default view: ranked offers with WhyYouPill;
  the full list stays one segment away (also the control-group for the CTR-lift metric).
- **Ask AI screen** — opened from the Home hero ("Ask about your visit") and a global entry; renders
  AIAnswerCard (headline + signal grid + source chips + suggested follow-ups). Not a bottom tab;
  support chat under More is unchanged and clearly separated (service vs. help).
- **Components** — build the mentor's kit as manifest-token-driven RN components: `RecoHero`,
  `WhyYouPill`, `OfferCard(ranked)`, `AriaOrb` (name/accent from manifest), `AIAnswerCard`,
  `SignalTile`, `SourceChip`, `ContextStrip`. Reanimated for orb drift/pulse + hero stagger only.
- **Manifest** — `features.concierge` flag + `concierge: { personaName, accentToken, entry: "home" }`
  block; nav untouched.

## 7. Rollout without interrupting Claude Code

The playbook is executed in order and is mid-Phase 3, so all concierge work is **appended as
PHASE 6 (P6.1–P6.7)** after Phase 5 — no existing prompt is edited or renumbered.

Dependency-safe interleaving (optional, if you want the demo sooner):
- **P6.1–P6.3 (backend)** depend only on Phase 2, which is complete. They can run at any pause
  point during Phase 3 — new module dir, new tables (new Alembic migrations), additive OpenAPI.
  Regenerating the api-client mid-Phase 3/4 is additive and safe.
- **P6.4 (admin)** after P3.2 (RBAC nav exists); natural slot is right after P3.11.
- **P6.5–P6.6 (mobile)** after P4.4 (Home/Offers exist); P6.7 last.
- Zero-risk default: just run Phase 6 after Phase 5 in sequence.

## 8. What's mocked vs. real (MVP)

| Layer | MVP | Phase 2 |
|---|---|---|
| Weather | **Real** — Open-Meteo (keyless) + mock fallback | paid provider if needed |
| Travel time | **Real-ish** — OSRM/haversine model + mock fallback | Google Distance Matrix |
| LLM narration | Mock scripted (offline demo) → real Claude by env | tuned prompts, streaming chat |
| Player value/ADT | LoyaltyPort mock personas | real CMP adapter |
| Offer ranking | Real scoring over seeded offers (hand-tuned weights) | learned relevance |
| Events/entertainment context | Out of scope | EventsPort |

## 9. Metrics (instrument in P6.7, events via the P2.9 sink)

Answer acceptance rate (hero CTA taps) · offer CTR lift, For You vs. list view · ask → action
conversion · visit attribution within 72h of a recommendation · time-to-first-answer (target
<1.5 s perceived, prefetch makes this free).

## 10. Decisions recorded + open questions

**Decided (2026-07-02):** embed in Home + Ask AI from hero (Option B intact; support chat stays
support-only) · free real APIs behind WeatherPort/TravelPort with mock fallback · append-only
Phase 6 in the playbook · Luminara/"Aria" = sample tenant persona/theme, all tenant-configurable.

**Open:**
1. Persona default name per tenant ("Aria" as seed default?) — cosmetic, decide at P6.4.
2. Does "which property should I visit" (multi-property) make MVP or v2? `properties` table ships
   either way; the comparison endpoint is ~1 extra prompt if wanted.
3. Real LLM key for the leadership demo, or scripted mock? Both paths ship; env decides.
