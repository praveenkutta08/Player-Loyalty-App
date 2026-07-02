import { cn } from '@/lib/cn';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-panel2 text-[11px] font-bold text-text2',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
