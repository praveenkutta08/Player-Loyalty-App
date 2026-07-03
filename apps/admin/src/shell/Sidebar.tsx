import { useRouterState } from '@tanstack/react-router';
import { Building2, ChevronsUpDown, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BRAND_ICON, groupsForScope } from '@/app/nav';
import { setActiveTenant, setTenants } from '@/app/sessionSlice';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { useListTenantsQuery } from '@/auth/authApi';
import { clearAuth } from '@/auth/authSlice';
import { tokenStore } from '@/auth/tokenStore';
import { useMe } from '@/auth/useAuth';
import { AppLink } from '@/components/AppLink';
import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';

export function Sidebar() {
  const scope = useAppSelector((s) => s.session.scope);
  const { tenants, activeTenantId } = useAppSelector((s) => s.session);
  const dispatch = useAppDispatch();
  const me = useMe();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const {
    data: apiTenants,
    isLoading: tenantsLoading,
    isError: tenantsError,
  } = useListTenantsQuery();

  // Server-scoped tenants are the ONLY source (M12 — no demo fallback). Mirror them into the
  // session store so the rest of the app reads real data, and pick a valid acting tenant once
  // they load; the switcher shows an explicit loading/empty state until then.
  useEffect(() => {
    if (!apiTenants) return;
    dispatch(
      setTenants(
        apiTenants.map((t) => ({ id: t.id, name: t.name, subtitle: `${t.slug} · ${t.status}` })),
      ),
    );
    if (apiTenants.length > 0 && !apiTenants.some((t) => t.id === activeTenantId)) {
      dispatch(setActiveTenant(apiTenants[0]!.id));
    }
  }, [apiTenants, activeTenantId, dispatch]);

  const activeTenant = tenants.find((t) => t.id === activeTenantId) ?? null;
  const tenantStatus: string | null = tenantsLoading
    ? 'Loading casinos…'
    : tenantsError
      ? 'Couldn’t load casinos'
      : tenants.length === 0
        ? 'No casinos available'
        : null;

  // Scope + permission filtering: the UI mirrors the server permissions (the real guard).
  const permissions = new Set(me?.permissions ?? []);
  const groups = groupsForScope(scope)
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.permission || permissions.has(it.permission)),
    }))
    .filter((g) => g.items.length > 0);

  const Brand = BRAND_ICON;
  const roleLabel = me?.roles[0]
    ? me.roles[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : scope === 'platform'
      ? 'Platform Admin'
      : 'Casino Admin';

  const signOut = () => {
    tokenStore.clear();
    dispatch(clearAuth());
  };

  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col border-r border-border bg-bg2">
      {/* Brand lockup */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-gold-bright to-gold-fill text-gold-ink">
          <Brand size={18} />
        </span>
        <div>
          <div className="text-[15px] font-extrabold tracking-tight text-text">CasinoOps</div>
          <div className="kicker">
            {scope === 'platform' ? 'Platform Console' : 'Casino Console'}
          </div>
        </div>
      </div>

      {/* Tenant switcher */}
      <div className="px-3">
        <button
          onClick={() => activeTenant && setSwitcherOpen((o) => !o)}
          disabled={!activeTenant}
          className="flex w-full items-center gap-2.5 rounded-control border border-border bg-panel px-3 py-2.5 text-left enabled:hover:bg-panel2 disabled:cursor-default"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-panel2 text-gold">
            <Building2 size={16} />
          </span>
          <span className="min-w-0 flex-1">
            {activeTenant ? (
              <>
                <span className="block truncate text-[13px] font-bold text-text">
                  {activeTenant.name}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {activeTenant.subtitle}
                </span>
              </>
            ) : (
              <span className="block truncate text-[12px] text-muted">{tenantStatus}</span>
            )}
          </span>
          {activeTenant && <ChevronsUpDown size={15} className="text-muted" />}
        </button>
        {switcherOpen && activeTenant && (
          <div className="mt-1 overflow-hidden rounded-control border border-border bg-panel shadow-md">
            {tenants.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  dispatch(setActiveTenant(t.id));
                  setSwitcherOpen(false);
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-[12px] hover:bg-panel2',
                  t.id === activeTenant.id ? 'text-gold' : 'text-text2',
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grouped nav */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="kicker px-2 pb-1.5">{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;
              return (
                <AppLink
                  key={item.id}
                  to={item.path}
                  className={cn(
                    'group mb-0.5 flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] transition-colors',
                    active
                      ? 'bg-nav-active font-semibold text-text'
                      : 'text-muted hover:bg-panel2 hover:text-text',
                  )}
                >
                  <Icon
                    size={17}
                    className={active ? 'text-gold' : 'text-muted group-hover:text-text2'}
                  />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge && (
                    <span className="font-mono text-[10px] text-faint">{item.badge}</span>
                  )}
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                </AppLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer: settings + user cell */}
      <div className="border-t border-border px-3 py-3">
        <AppLink
          to="/settings"
          className="mb-2 flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] text-muted hover:bg-panel2 hover:text-text"
        >
          <Settings size={17} /> Settings
        </AppLink>
        <div className="flex items-center gap-2.5 rounded-control bg-panel px-2.5 py-2">
          <Avatar name={me?.full_name ?? me?.email ?? 'Admin'} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-semibold text-text">
              {me?.full_name ?? me?.email ?? 'Admin'}
            </div>
            <div className="truncate text-[11px] text-muted">{roleLabel}</div>
          </div>
          <button onClick={signOut} className="text-muted hover:text-text" aria-label="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
