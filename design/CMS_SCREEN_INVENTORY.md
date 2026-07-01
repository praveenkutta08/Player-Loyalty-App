# CMS Portal Screen Inventory (reconciled)

~35 admin screens across 8 nav groups, reconciled from the `design_handoff_casino_cms` bundle plus
our requirements. Two roles: **Platform Admin** (super-admin; can be scoped to specific tenants =
Account Manager) and **Casino Admin** (single tenant). Each screen maps to a Phase-3 build prompt.
`[+]` = added (missing from the design) · `[~]` = extends a design view.

**MVP legend:** `[real]` shipped real · `[mock]` real UX, mocked adapter (real vendor Phase 2).

## Overview
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| DSH | Dashboard | Role-aware KPIs, approvals, health | P3.19 | real |
| ANL | Analytics | DAU, redemptions, retention, funnels | P3.19 | real |

## Casinos (Platform)
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| CAS1 | Directory | Property table + filters | P3.3 | real |
| CAS2 | Property Detail | Stats + feature config + publish history | P3.3 | real |
| CAS3 | Creation Wizard | 5-step property provisioning | P3.3 | real |

## Experience
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| HPB | Homepage Builder | Drag-drop mobile home -> manifest modules | P3.12 | real |
| NAV | Navigation Builder | Reorder tabs -> manifest navigation | P3.12 | real |
| CNT | Content | Author/schedule/publish content | P3.5 | real |
| MED | Media Library | DAM (assets, folders, usage) | P3.13 | real |
| THM | Theme | Branding + live preview (light/dark) | P3.4 | real |
| LOC | Localization | Languages + regional formats | P3.14 | real |

## Engagement
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| PRO1 | Promotions List | Promotions table | P3.6 | real |
| PRO2 | Promotions Calendar | Month grid of promotions | P3.6 | real |
| PRO3 | Promotion Detail | Targeting, schedule, performance | P3.6 | real |
| OFR | Offers `[+]` | Offers list/detail (separate from promos) | P3.6 | real |
| RWD1 | Rewards: Tiers | 5-tier ladder | P3.10 | real |
| RWD2 | Rewards: Points rules | Earning rules | P3.10 | real |
| RWD3 | Rewards: Marketplace `[+]` | Redeemable item catalog | P3.10 | real |
| RWD4 | Rewards: Bonus campaigns | Active campaigns | P3.10 | real |
| GAM | Games `[+]` | Catalog curation + jackpot + leaderboard | P3.10 | real |
| NOT | Notifications `[~]` | Multi-channel + A/B composer | P3.7 | real (push); email/SMS via provider |
| GEO1 | Geofence Zones `[+]` | Map: points/radius/polygon/beacons | P3.8 | mock geo |
| GEO2 | Location Triggers `[+]` | Enter/dwell rules + caps | P3.8 | real |
| SUP | Support Assistant `[+]` | FAQ/knowledge, guardrails, escalation | P3.11 | mock |

## Operations
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| HTL | Hotel | Room types, amenities, room keys | P3.9 | mock (PMS/key) |
| DIN | Dining | Restaurants + specials | P3.9 | real |
| ENT | Entertainment | Events + ticket status | P3.9 | real |
| VAL | Valet `[+]` | Config + live request queue | P3.9 | mock |
| RSV | Reservations queue `[+]` | Cross-venue bookings list | P3.9 | real |

## Players
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| MBR1 | Members list `[+]` | Search/filter players (masked) | P3.15 | real |
| MBR2 | Member profile `[+]` | Player 360 (PII masked; unmask/export gated + audited) | P3.15 | real |
| CMP | Compliance & Responsible Gaming `[+]` | KYC, RG limits, self-exclusion, geo rules | P3.16 | mock (KYC/geo) |

## Money
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| PAY | Payments & Cashless `[+]` | Enable/limits + transactions/reconciliation (read) | P3.18 | mock host |

## Platform
| ID | Screen | Purpose | Prompt | MVP |
|----|--------|---------|--------|-----|
| USR | Users & Roles | Admin users + role permission checklist | P3.2 | real |
| FLG | Feature Flags | Per-tenant flags + rollout | P3.3 | real |
| AUD | Audit & Publishing `[~]` | Draft->Review->Approved->Published + audit log | P3.17 | real |
| SET | Settings & Integrations | Adapter creds, API keys, security (SSO/MFA/IP) | P3.18 | real |
| SHELL | App shell | Sidebar, topbar, role switch, light/dark | P3.1 | real |

## Roles & PII
- **Platform Admin** (optionally scoped = Account Manager) vs **Casino Admin**; the topbar
  Platform|Casino switch swaps nav/tenant/scope. Authorization is server-side (Permissions Matrix).
- **Player PII (MBR2):** masked by default; unmasking and export require an elevated permission and
  are audited; marketers/editors get segments only; wallet/transaction detail limited to
  admin/finance/support.

## Count
~35 screens: Overview 2 · Casinos 3 · Experience 6 · Engagement 13 · Operations 5 · Players 3 ·
Money 1 · Platform 5.
