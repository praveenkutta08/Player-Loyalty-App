// Typed API client for the Player Mobile App backend.
//
// GOLDEN RULE #7: OpenAPI is the contract. Types under `./generated` are produced by
// `pnpm --filter @repo/api-client generate`; the RTK Query `baseApi` is extended per-domain via
// `injectEndpoints`. The admin console and mobile app import from here — never hand-write shapes.
export * from './baseApi';
export type { paths, components, operations, webhooks } from './generated/schema';
