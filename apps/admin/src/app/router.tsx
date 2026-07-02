import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { NAV_ITEMS, type NavItem } from './nav';
import { SCREEN_REGISTRY } from './screenRegistry';

import { useHasPermission } from '@/auth/useAuth';
import { Forbidden } from '@/screens/Forbidden';
import { Placeholder } from '@/screens/Placeholder';
import { AppShell } from '@/shell/AppShell';

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    // Path literals aren't inferred for the dynamically built route tree; cast is safe.
    throw redirect({ to: '/dashboard' as never });
  },
});

/** A screen wrapped in its route's permission guard (mirrors the server 403). */
function GuardedScreen({ item }: { item: NavItem }) {
  const allowed = useHasPermission(item.permission);
  if (!allowed) return <Forbidden permission={item.permission} />;
  const Real = SCREEN_REGISTRY[item.path];
  return Real ? <Real /> : <Placeholder id={item.id} title={item.label} />;
}

const navRoutes = NAV_ITEMS.map((item) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: item.path,
    component: () => <GuardedScreen item={item} />,
  }),
);

const routeTree = rootRoute.addChildren([indexRoute, ...navRoutes]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
