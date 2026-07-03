import { useNavigate, useRouterState } from '@tanstack/react-router';
import { Bell, Moon, Plus, Search, Sun } from 'lucide-react';

import { NAV_ITEMS } from '@/app/nav';
import { setScope, type RoleScope } from '@/app/sessionSlice';
import { useAppDispatch, useAppSelector } from '@/app/store';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme/ThemeProvider';

const SCOPES: { key: RoleScope; label: string }[] = [
  { key: 'platform', label: 'Platform' },
  { key: 'casino', label: 'Casino' },
];

export function Topbar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const scope = useAppSelector((s) => s.session.scope);
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const current = NAV_ITEMS.find((i) => pathname === i.path || pathname.startsWith(`${i.path}/`));
  const viewTitle = current?.label ?? 'Dashboard';

  // Switching Platform/Casino swaps the nav set + scope and resets to the Dashboard.
  const switchScope = (next: RoleScope) => {
    if (next === scope) return;
    dispatch(setScope(next));
    void navigate({ to: '/dashboard' as never });
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-bg px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-muted">{scope === 'platform' ? 'Platform' : 'Casino'}</span>
        <span className="text-faint">/</span>
        <span className="font-semibold text-text">{viewTitle}</span>
      </div>

      {/* Search — the dead ⌘K affordance was removed (no command palette wired) (LOW). */}
      <div className="relative ml-4 hidden max-w-sm flex-1 md:block">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          placeholder="Search..."
          aria-label="Search"
          className="w-full rounded-control border border-border bg-input py-2 pl-9 pr-3 text-[13px] text-text placeholder:text-muted outline-none focus:border-gold"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Role segmented control */}
        <div className="inline-flex items-center gap-1 rounded-control border border-border bg-panel p-1">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => switchScope(s.key)}
              className={cn(
                'rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition-colors',
                scope === s.key ? 'bg-gold-dim text-gold' : 'text-muted hover:text-text',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="flex h-9 w-9 items-center justify-center rounded-control border border-border text-muted hover:text-text"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification bell */}
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-control border border-border text-muted hover:text-text"
        >
          <Bell size={16} />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red" />
        </button>

        {/* Create */}
        <Button variant="primary" size="sm" icon={<Plus size={16} />}>
          Create
        </Button>
      </div>
    </header>
  );
}
