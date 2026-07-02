import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional gold/colored top accent border (premium cards). */
  accent?: string;
}

export function Card({ className, accent, style, children, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-card border border-border bg-panel shadow-card', className)}
      style={accent ? { borderTop: `2px solid ${accent}`, ...style } : style}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-4', className)}>
      <div>
        <h3 className="text-[15px] font-bold text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
