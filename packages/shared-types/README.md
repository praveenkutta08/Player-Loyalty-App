# @repo/shared-types

Hand-authored TypeScript types shared across the admin console and mobile app (and any other
TS consumer in the monorepo).

- Extends `@repo/config` for tsconfig/eslint/prettier.
- Build emits `dist/` (declarations + JS) via `tsc`.
- For request/response shapes derived from the backend, use `@repo/api-client` (generated from
  OpenAPI) instead of duplicating them here.
