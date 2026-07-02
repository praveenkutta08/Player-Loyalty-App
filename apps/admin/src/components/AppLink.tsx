import { Link } from '@tanstack/react-router';

import type { ComponentProps } from 'react';

type LinkComponentProps = ComponentProps<typeof Link>;

/**
 * Thin wrapper over TanStack's <Link>. Our route tree is generated dynamically from NAV_ITEMS,
 * so concrete paths aren't part of the inferred literal `to` union — this accepts a plain string
 * and forwards it. Runtime behavior is unchanged; only the compile-time path literal is relaxed.
 */
export function AppLink({ to, ...rest }: Omit<LinkComponentProps, 'to'> & { to: string }) {
  return <Link to={to as never} {...rest} />;
}
