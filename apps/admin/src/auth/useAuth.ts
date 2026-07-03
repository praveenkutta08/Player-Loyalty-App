import { useAppSelector } from '@/app/store';

/** The authenticated admin (roles, permissions, tenant scope), or null when anonymous. */
export function useMe() {
  return useAppSelector((s) => s.auth.me);
}

/**
 * Mirror of the server permission check (GOLDEN RULE #2 — the server is the real guard). An
 * undefined permission means "no explicit permission required" (visible to any authenticated admin).
 */
export function useHasPermission(permission?: string): boolean {
  const me = useMe();
  if (!permission) return true;
  return Boolean(me?.permissions.includes(permission));
}
