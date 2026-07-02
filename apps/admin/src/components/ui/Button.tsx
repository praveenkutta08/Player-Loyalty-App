import { forwardRef } from 'react';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gold-fill text-gold-ink hover:brightness-105 border border-transparent font-semibold',
  secondary: 'bg-transparent text-text border border-border-strong hover:bg-panel2',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-panel2 border border-transparent',
  danger: 'bg-red-dim text-red border border-transparent hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-[12px] rounded-control gap-1.5',
  md: 'h-10 px-4 text-[13px] rounded-pill gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});
