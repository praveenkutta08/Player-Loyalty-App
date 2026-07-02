import { cn } from '@/lib/cn';

/** Gold toggle switch matching the design: on = gold track + dark knob pushed right. */
export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-[40px] shrink-0 items-center rounded-pill transition-colors disabled:opacity-40',
        checked ? 'bg-gold-fill' : 'bg-track',
      )}
    >
      <span
        className={cn(
          'absolute h-[16px] w-[16px] rounded-full transition-transform',
          checked ? 'translate-x-[21px] bg-gold-ink' : 'translate-x-[3px] bg-faint',
        )}
      />
    </button>
  );
}
