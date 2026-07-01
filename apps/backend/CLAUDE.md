# apps/backend — FastAPI service (CLAUDE.md)

Modular monolith. One deployable, clear domain modules, extractable to services later.

## Layout
```
app/
  main.py            app factory, router registration, middleware
  core/              settings, security (JWT), logging, errors (RFC 7807), pagination, deps
  db/                engine/session (async), base model, RLS helpers, Alembic env
  tenancy/           tenant resolution dependency + RLS GUC setter
  rbac/              roles, permissions, permission dependency (`require(perm)`)
  ports/             abstract adapter interfaces (Loyalty/Cashless/DigitalKey/Kyc/Geo/Payment/Push)
  adapters/mock/     mock implementations (MVP default)
  modules/
    identity/  tenants/  content/  offers/  loyalty/  wallet/
    reservations/  digitalkey/  notifications/  geofencing/  games/  rewards/  support/  audit/
      -> each: models.py schemas.py service.py router.py (+ tests)
tests/               pytest + httpx
alembic/             migrations
```

## Rules
- **Async everywhere** (asyncpg). Sessions via dependency; commit/rollback handled per request.
- **RLS:** every tenant-owned model has `tenant_id`. The tenancy dependency sets
  `SET LOCAL app.current_tenant = :tenant` on the connection; policies do the filtering.
- **AuthZ:** decorate/inject `require("resource:action")` on every protected route. Never ship a
  route without an explicit permission (or an explicit `public=True`).
- **Adapters:** inject ports via FastAPI dependencies; concrete impl chosen by `ADAPTER_MODE`.
- **Money:** wallet endpoints require `Idempotency-Key`; write to append-only `wallet_transactions`.
- **Every mutation** on privileged/financial/config resources writes an `audit_logs` row.
- **Contract tests** run the same suite against a port's mock and (later) real adapter.

## Commands
- `uv sync` install; `uv run uvicorn app.main:app --reload` serve.
- `uv run alembic revision --autogenerate -m "msg"` / `uv run alembic upgrade head`.
- `uv run pytest` test. `uv run ruff check .` + `uv run mypy app` lint/type.
- OpenAPI JSON at `/api/v1/openapi.json` — used to generate `packages/api-client`.
