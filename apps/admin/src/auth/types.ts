import type { components } from '@repo/api-client';

// Auth shapes come straight from the generated OpenAPI schema (GOLDEN RULE #7).
export type TokenPair = components['schemas']['TokenPair'];
export type AdminLoginRequest = components['schemas']['AdminLoginRequest'];
export type AdminMe = components['schemas']['AdminMeOut'];
export type TenantOut = components['schemas']['TenantOut'];
