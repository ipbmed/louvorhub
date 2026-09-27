import React, {
  createContext,
  useCallback,
  useContext,
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

export function ApiBusyProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const begin = useCallback(() => {
    countRef.current += 1;
    setCount(countRef.current);
  }, []);

  const end = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    setCount(countRef.current);
  }, []);

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
        <div
          className="fixed inset-0 z-[200] bg-stone-950/55 backdrop-blur-[2px] flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-stone-900/95 border border-stone-700 shadow-2xl">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
            <p className="text-xs font-semibold text-stone-300 tracking-wide">
              Aguarde…
            </p>
          </div>
        </div>
      )}
    </ApiBusyContext.Provider>
  );
}

export function useApiBusy() {
  const ctx = useContext(ApiBusyContext);
  if (!ctx) throw new Error('useApiBusy deve ser usado dentro de ApiBusyProvider');
  return ctx;
}
