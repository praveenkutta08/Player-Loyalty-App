import type { components } from '@repo/api-client';

// Auth shapes come straight from the generated OpenAPI schema (GOLDEN RULE #7).
export type TokenPair = components['schemas']['TokenPair'];
// H5: admin login/refresh return only the access token; the refresh token is an httpOnly cookie.
export type AdminAuth = components['schemas']['AdminAuthOut'];
export type AdminLoginRequest = components['schemas']['AdminLoginRequest'];
export type AdminMe = components['schemas']['AdminMeOut'];
export type TenantOut = components['schemas']['TenantOut'];
