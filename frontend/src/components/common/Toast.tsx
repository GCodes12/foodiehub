import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CircleCheck, X } from 'lucide-react';
import { t } from '../../utils/i18n.ts';

// Short confirmations ("Mango Lassi added to cart"), announced to screen readers via aria-live.

interface ToastItem {
  id: number;
  text: string;
}

const ToastContext = createContext<(text: string) => void>(() => {});

export function useToast(): (text: string) => void {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
  }, []);

  const show = useCallback((text: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-2), { id, text }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 2800));
  }, [dismiss]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            <CircleCheck size={18} aria-hidden="true" className="toast-icon" />
            <span className="toast-text">{toast.text}</span>
            <button type="button" className="icon-button toast-close" onClick={() => dismiss(toast.id)}
              aria-label={t('common.dismiss')}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
