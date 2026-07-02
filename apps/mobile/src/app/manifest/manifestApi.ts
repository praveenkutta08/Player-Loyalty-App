import { baseApi } from '@repo/api-client';

import type { ManifestOut } from './normalize';

/**
 * Manifest endpoint injected onto the shared `baseApi` (GOLDEN RULE #7 — types come from the
 * generated OpenAPI schema). The manifest is public but tenant-scoped via the `X-Tenant` header,
 * which the mobile app supplies from its per-tenant build config (the player token isn't available
 * yet at launch). Fetched fresh each launch so a bumped `version` is always picked up.
 */
export const manifestApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getManifest: build.query<ManifestOut, { tenantId: string }>({
      query: ({ tenantId }) => ({
        url: '/config/manifest',
        headers: { 'X-Tenant': tenantId },
      }),
      providesTags: ['Manifest'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetManifestQuery } = manifestApi;
