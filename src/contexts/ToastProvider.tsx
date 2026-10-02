import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastOptions {
  /** Duração em ms (padrão 3200; erros 5000). 0 = persistente até fechar. */
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind, options?: ToastOptions) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const KIND_STYLE: Record<ToastKind, { box: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { box: 'border-brand-line text-fg [&_.toast-icon]:text-brand-text', icon: CheckCircle2 },
  error: { box: 'border-danger-line text-fg [&_.toast-icon]:text-danger-text', icon: AlertCircle },
  warning: { box: 'border-warning-line text-fg [&_.toast-icon]:text-warning-text', icon: AlertTriangle },
  info: { box: 'border-info-line text-fg [&_.toast-icon]:text-info-text', icon: Info },
};

const MAX_VISIBLE = 3;

/** Heurística: mensagens que começam com termos de erro viram toast de erro. */
function inferKind(message: string, kind?: ToastKind): ToastKind {
  if (kind) return kind;
  if (/^(erro|falha|não foi possível|nao foi possivel|sem permissão|somente|apenas)/i.test(message)) {
    return 'error';
  }
  return 'success';
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, kind?: ToastKind, options?: ToastOptions) => {
      const resolvedKind = inferKind(message, kind);
      const id = ++idRef.current;
      const duration =
        options?.duration ?? (resolvedKind === 'error' || options?.actionLabel ? 5000 : 3200);
      setToasts((prev) => {
        const next = [
          ...prev,
          { id, message, kind: resolvedKind, actionLabel: options?.actionLabel, onAction: options?.onAction },
        ];
        // Descarta os mais antigos além do limite.
        const overflow = next.length - MAX_VISIBLE;
        if (overflow > 0) {
          next.slice(0, overflow).forEach((t) => {
            const timer = timers.current.get(t.id);
            if (timer) clearTimeout(timer);
            timers.current.delete(t.id);
          });
          return next.slice(overflow);
        }
        return next;
      });
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismissToast(id), duration),
        );
      }
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[300] flex flex-col items-center sm:items-end gap-2 px-3 sm:px-6 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:pb-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => {
          const { box, icon: Icon } = KIND_STYLE[toast.kind];
          return (
            <div
              key={toast.id}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto w-full sm:w-auto sm:max-w-sm flex items-start gap-2.5 px-3.5 py-3 rounded-2xl border bg-surface shadow-2xl text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${box}`}
            >
              <Icon className="toast-icon w-4 h-4 shrink-0 mt-[1px]" />
              <span className="flex-1 min-w-0 leading-snug break-words">{toast.message}</span>
              {toast.actionLabel && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    dismissToast(toast.id);
                  }}
                  className="shrink-0 px-2 py-1 -my-1 rounded-button text-brand-text hover:bg-brand-soft font-bold"
                >
                  {toast.actionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Fechar notificação"
                className="shrink-0 -mr-1 -my-0.5 p-1 rounded-button text-fg-subtle hover:text-fg hover:bg-muted"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
