import { baseApi } from '@repo/api-client';

import type { AdminLoginRequest, AdminMe, TenantOut, TokenPair } from './types';

// Auth + tenant endpoints injected onto the shared baseApi. Refresh is handled by the baseApi
// reauth bridge (see authBridge.ts), not as an RTK endpoint, so it can run mid-request.
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<TokenPair, AdminLoginRequest>({
      query: (body) => ({ url: '/auth/admin/login', method: 'POST', body }),
    }),
    me: build.query<AdminMe, void>({
      query: () => ({ url: '/auth/admin/me' }),
    }),
    listTenants: build.query<TenantOut[], void>({
      query: () => ({ url: '/tenants' }),
      providesTags: ['Tenant'],
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useMeQuery, useLazyMeQuery, useListTenantsQuery } = authApi;
