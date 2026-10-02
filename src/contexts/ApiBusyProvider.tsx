import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Loader2 } from 'lucide-react';

interface ApiBusyContextValue {
  busy: boolean;
  /** Incrementa o contador de operações em voo. */
  begin: () => void;
  /** Decrementa o contador de operações em voo. */
  end: () => void;
  /** Executa uma Promise mostrando o overlay enquanto ela não resolve. */
  withBusy: <T>(fn: () => Promise<T>) => Promise<T>;
}

const ApiBusyContext = createContext<ApiBusyContextValue | null>(null);

/** Atraso antes de exibir o overlay — evita "piscar" em operações rápidas. */
const SHOW_DELAY_MS = 220;

export function ApiBusyProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const countRef = useRef(0);

  const begin = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const end = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

  useEffect(() => {
    if (count > 0) {
      const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
      return () => clearTimeout(t);
    }
    setVisible(false);
    return undefined;
  }, [count]);

  const withBusy = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      begin();
      try {
        return await fn();
      } finally {
        end();
      }
    },
    [begin, end],
  );

  const value = useMemo(
    () => ({ busy: count > 0, begin, end, withBusy }),
    [count, begin, end, withBusy],
  );

  return (
    <ApiBusyContext.Provider value={value}>
      {children}
      {count > 0 && (
        <>
          {/* Barra de progresso no topo — feedback imediato e discreto */}
          <div
            className="fixed top-0 inset-x-0 z-[210] h-0.5 overflow-hidden pointer-events-none"
            aria-hidden
          >
            <div className="h-full w-1/3 bg-brand rounded-full animate-[busybar_1.1s_ease-in-out_infinite]" />
          </div>
          {visible && (
            <div
              className="fixed inset-0 z-[200] bg-overlay/60 backdrop-blur-[1.5px] flex items-center justify-center animate-in fade-in duration-150"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex flex-col items-center gap-3 px-7 py-5 rounded-2xl bg-surface border border-line shadow-2xl">
                <Loader2 className="w-8 h-8 text-brand-text animate-spin" />
                <p className="text-xs font-semibold text-fg-muted tracking-wide">Aguarde…</p>
              </div>
            </div>
          )}
        </>
      )}
      <style>{`@keyframes busybar{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}`}</style>
    </ApiBusyContext.Provider>
  );
}

export function useApiBusy() {
  const ctx = useContext(ApiBusyContext);
  if (!ctx) throw new Error('useApiBusy deve ser usado dentro de ApiBusyProvider');
  return ctx;
}
