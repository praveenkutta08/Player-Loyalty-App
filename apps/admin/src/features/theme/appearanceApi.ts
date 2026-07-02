import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type AppearanceUpdate = components['schemas']['AppearanceUpdate'];
export type TenantConfig = components['schemas']['TenantConfigOut'];

/** Appearance publish (P7.1/P7.2): splash + nav style + typography pairing. Branding-gated
 * server-side; every write bumps the manifest version + audits. */
export const appearanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    updateAppearance: build.mutation<TenantConfig, AppearanceUpdate>({
      query: (body) => ({ url: '/config/appearance', method: 'PUT', body }),
      invalidatesTags: ['Tenant', 'Manifest'],
    }),
  }),
  overrideExisting: false,
});

export const { useUpdateAppearanceMutation } = appearanceApi;
