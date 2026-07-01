# @repo/api-client

Typed client for the backend API, **generated from the backend OpenAPI document** — never
hand-written (GOLDEN RULE #7). The admin console and mobile app consume the generated types and
hooks from here.

- Extends `@repo/config` for tsconfig/eslint/prettier.
- `pnpm --filter @repo/api-client generate` regenerates `src/` from `/api/v1/openapi.json`
  (wired once the backend is scaffolded).
- `pnpm --filter @repo/api-client build` emits `dist/`.

Regenerate whenever the backend API changes so consumers stay in sync with the contract.
