import { useHasPermission } from './useAuth';

import type { ReactNode } from 'react';

/**
 * Renders children only if the current admin holds `permission`. The UI merely MIRRORS the
 * server's authorization (GOLDEN RULE #2); every protected API route re-checks independently.
 */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return useHasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
