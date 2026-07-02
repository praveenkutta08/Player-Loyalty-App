import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface TabItem {
  key: string;
  label: ReactNode;
}

/** Segmented control / tab strip. */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-control border border-border bg-panel p-1',
        className,
      )}
    >
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cn(
            'rounded-[7px] px-3 py-1.5 text-[12px] font-semibold transition-colors',
            value === it.key ? 'bg-gold-dim text-gold' : 'text-muted hover:text-text',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
