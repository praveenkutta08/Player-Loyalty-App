import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';

import { NAV_ITEMS } from './nav';
import { SCREEN_REGISTRY } from './screenRegistry';

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

const navRoutes = NAV_ITEMS.map((item) =>
  createRoute({
    getParentRoute: () => rootRoute,
    path: item.path,
    component: () => {
      const Real = SCREEN_REGISTRY[item.path];
      return Real ? <Real /> : <Placeholder id={item.id} title={item.label} />;
    },
  }),
);

const routeTree = rootRoute.addChildren([indexRoute, ...navRoutes]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
