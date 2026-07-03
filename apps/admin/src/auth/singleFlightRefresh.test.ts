// @vitest-environment node
// Node env (not jsdom): RTK Query drives the real fetch/AbortSignal, and jsdom's AbortSignal is
// not accepted by undici's fetch. This test needs no DOM.
import { configureStore } from '@reduxjs/toolkit';
import { baseApi, configureApiAuth, setApiBaseUrl } from '@repo/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// H5 — with rotating refresh tokens (M1), two concurrent 401s must NOT each fire their own refresh:
// the first would rotate the token and the rest would replay a revoked one, tripping reuse-detection
// and logging the user out. The shared baseApi collapses concurrent refreshes into a single call.

// A throwaway query with a numeric arg so two dispatches make two DISTINCT requests (RTK Query
// dedupes identical ones), both of which 401 and reach the refresh path.
const testApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    ping: build.query<unknown, number>({ query: (n) => `/ping/${n}` }),
  }),
  overrideExisting: true,
});

function makeStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

describe('single-flight refresh (H5)', () => {
  beforeEach(() => {
    // undici (the test-env fetch) rejects relative URLs, so give baseApi an absolute origin.
    setApiBaseUrl('http://localhost/api/v1');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ detail: 'nope' }), { status: 401 })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shares one refresh across concurrent 401s', async () => {
    let releaseRefresh!: (ok: boolean) => void;
    const refresh = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          releaseRefresh = resolve;
        }),
    );
    configureApiAuth({ getAccessToken: () => null, refresh, onUnauthorized: () => {} });

    const store = makeStore();
    const p1 = store.dispatch(testApi.endpoints.ping.initiate(1));
    const p2 = store.dispatch(testApi.endpoints.ping.initiate(2));

    // Let both requests reach their 401 and the shared refresh gate before we let refresh settle.
    await new Promise((r) => setTimeout(r, 10));
    expect(refresh).toHaveBeenCalledTimes(1);

    releaseRefresh(false); // refresh fails -> both give up (no infinite loop)
    await Promise.all([p1, p2]);

    // Still exactly one refresh after everything settles.
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
