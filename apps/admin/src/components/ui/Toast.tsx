import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 size={16} className="text-green" />,
  error: <XCircle size={16} className="text-red" />,
  info: <Info size={16} className="text-blue" />,
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, tone, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-2 rounded-control border border-border bg-panel px-4 py-3 text-[13px] text-text shadow-md',
            )}
          >
            {icons[t.tone]}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
