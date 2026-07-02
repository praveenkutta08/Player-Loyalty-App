import { X } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from './Button';

import type { ReactNode } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal
    >
      <div className="absolute inset-0 bg-[var(--scrim)]" onClick={onClose} />
      <div
        className={`relative w-full ${width} rounded-card border border-border bg-panel shadow-md`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-bold text-text">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}

export { Button as ModalButton };
