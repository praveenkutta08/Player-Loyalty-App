import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type Tone = 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'neutral';

const tones: Record<Tone, { text: string; bg: string }> = {
  gold: { text: 'text-gold', bg: 'bg-gold-dim' },
  green: { text: 'text-green', bg: 'bg-green-dim' },
  red: { text: 'text-red', bg: 'bg-red-dim' },
  blue: { text: 'text-blue', bg: 'bg-blue-dim' },
  purple: { text: 'text-purple', bg: 'bg-purple-dim' },
  neutral: { text: 'text-muted', bg: 'bg-panel2' },
};

const dotColor: Record<Tone, string> = {
  gold: 'bg-gold',
  green: 'bg-green',
  red: 'bg-red',
  blue: 'bg-blue',
  purple: 'bg-purple',
  neutral: 'bg-muted',
};

/** Rounded status pill with a leading dot; `tag` variant is rectangular (type tags). */
export function StatusPill({
  tone = 'neutral',
  dot = true,
  tag = false,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  tag?: boolean;
  children: ReactNode;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-[3px] text-[11.5px] font-semibold',
        t.text,
        t.bg,
        tag ? 'rounded-md' : 'rounded-pill',
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColor[tone])} />}
      {children}
    </span>
  );
}
