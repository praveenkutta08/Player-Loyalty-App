import { forwardRef } from 'react';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

import { cn } from '@/lib/cn';

const fieldBase =
  'w-full bg-input text-text border border-border rounded-control px-3 py-2 text-[13px] placeholder:text-muted outline-none transition-colors focus:border-gold focus:shadow-gold-glow disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, icon, ...props },
  ref,
) {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          {icon}
        </span>
        <input ref={ref} className={cn(fieldBase, 'pl-9', className)} {...props} />
      </div>
    );
  }
  return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea ref={ref} className={cn(fieldBase, 'min-h-[84px] resize-y', className)} {...props} />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(fieldBase, 'appearance-none pr-8', className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <label className={cn('mb-1.5 block text-label font-semibold uppercase text-muted', className)}>
      {children}
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
