import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

import type { ReactNode } from 'react';

/** Persistent chrome: 250px sidebar + 64px topbar + centered content area (max 1500px). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-content">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-content px-8 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
