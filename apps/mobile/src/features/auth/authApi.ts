import { baseApi } from '@repo/api-client';

import { buildConfig } from '../../config/buildConfig';

import type { components } from '@repo/api-client';

type TokenPair = components['schemas']['TokenPair'];
type PlayerMeOut = components['schemas']['PlayerMeOut'];
type DeviceOut = components['schemas']['DeviceOut'];

/** Tenant header for pre-auth calls: the player token isn't available until after login. */
const tenantHeader = { 'X-Tenant': buildConfig.tenantId };

/**
 * Player-audience auth endpoints injected on the shared baseApi (types from the generated OpenAPI
 * schema — GOLDEN RULE #7). Login/OTP are pre-auth and carry the tenant via X-Tenant; once a token
 * is issued it embeds the tenant, so later calls don't need the header. The refresh network call is
 * done directly in features/auth/session (outside RTK) to avoid the 401 re-auth loop.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    playerLogin: build.mutation<TokenPair, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/player/login', method: 'POST', body, headers: tenantHeader }),
    }),
    requestOtp: build.mutation<{ status: string }, { email: string }>({
      query: (body) => ({
        url: '/auth/player/otp/request',
        method: 'POST',
        body,
        headers: tenantHeader,
      }),
    }),
    verifyOtp: build.mutation<TokenPair, { email: string; code: string }>({
      query: (body) => ({
        url: '/auth/player/otp/verify',
        method: 'POST',
        body,
        headers: tenantHeader,
      }),
    }),
    registerDevice: build.mutation<DeviceOut, { platform: string; push_token: string }>({
      query: (body) => ({ url: '/me/devices', method: 'POST', body }),
    }),
    getMe: build.query<PlayerMeOut, void>({
      query: () => ({ url: '/players/me' }),
      providesTags: ['Player'],
    }),
  }),
  overrideExisting: false,
});

export const {
  usePlayerLoginMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useRegisterDeviceMutation,
  useGetMeQuery,
} = authApi;
