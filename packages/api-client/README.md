# @repo/api-client

Typed client for the backend API. Types are **generated from the backend OpenAPI document**, never
hand-written (GOLDEN RULE #7). The admin console and mobile app consume the generated types and the
shared RTK Query `baseApi` from here.

## Usage

- `pnpm --filter @repo/api-client generate` — runs `openapi-typescript` against
  `http://localhost:8000/api/v1/openapi.json` and writes `src/generated/schema.ts`. Re-run whenever
  the backend API changes so consumers stay in sync with the contract.
- `pnpm --filter @repo/api-client build` — emits `dist/`.

## What's exported

- `baseApi` — the RTK Query base API. Domain endpoints are added later via
  `baseApi.injectEndpoints(...)`, typed from `./generated/schema`.
- `API_REDUCER_PATH`, `API_TAG_TYPES` — wiring for the store and cache invalidation.
- `paths`, `components`, `operations`, `webhooks` — the generated OpenAPI types.

The `baseApi` `baseUrl` defaults to a relative `/api/v1`; the mobile app overrides it at runtime
from the tenant manifest's `endpoints.apiBaseUrl`.

Extends `@repo/config` for tsconfig/eslint/prettier.
