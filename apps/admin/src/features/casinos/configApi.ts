import { baseApi } from '@repo/api-client';

import type { components } from '@repo/api-client';

export type TenantConfig = components['schemas']['TenantConfigOut'];
export type TenantConfigUpdate = components['schemas']['TenantConfigUpdate'];

/**
 * Tenant config (feature flags, endpoints, navigation) for the ACTING tenant — the sidebar
 * selection is sent as X-Tenant by the shared baseApi, and the server enforces the allow-list.
 */
export const configApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getConfig: build.query<TenantConfig, void>({
      query: () => ({ url: '/config' }),
      providesTags: ['Tenant', 'Manifest'],
    }),
    updateConfig: build.mutation<TenantConfig, TenantConfigUpdate>({
      query: (body) => ({ url: '/config', method: 'PUT', body }),
      invalidatesTags: ['Tenant', 'Manifest'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetConfigQuery, useUpdateConfigMutation } = configApi;
