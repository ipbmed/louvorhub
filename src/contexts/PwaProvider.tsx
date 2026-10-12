import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { registerSW } from 'virtual:pwa-register';
import { Download, RefreshCw, WifiOff, X } from 'lucide-react';
import { ActionButton } from '@/components/ui';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaContextValue {
  /** Há nova versão pronta para aplicar. */
  needRefresh: boolean;
  /** Aplica a atualização (recarrega). */
  updateApp: () => Promise<void>;
  /** O navegador oferece instalação nativa. */
  canInstall: boolean;
  /** Dispara o prompt nativo de instalação. */
  install: () => Promise<boolean>;
  /** Alias de `install`. */
  promptInstall: () => Promise<boolean>;
  /** Já está rodando como app instalado. */
  isStandalone: boolean;
  /** iOS Safari: instalação só via "Compartilhar → Adicionar à Tela de Início". */
  isIos: boolean;
  isOffline: boolean;
}

const PwaContext = createContext<PwaContextValue | null>(null);

const INSTALL_DISMISS_KEY = 'louvorhub_pwa_install_dismissed';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function detectIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iosDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iosDevice || iPadOs;
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [installBannerDismissed, setInstallBannerDismissed] = useState(() => {
    try {
      return localStorage.getItem(INSTALL_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const isStandalone = useMemo(detectStandalone, []);
  const isIos = useMemo(detectIos, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    updateSWRef.current = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_url, registration) {
        // Verifica atualizações a cada hora enquanto o app estiver aberto.
        if (!registration) return;
        const interval = setInterval(() => {
          void registration.update();
        }, 60 * 60 * 1000);
        window.addEventListener('beforeunload', () => clearInterval(interval), { once: true });
      },
    });
  }, []);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const updateApp = useCallback(async () => {
    if (updateSWRef.current) await updateSWRef.current(true);
    else window.location.reload();
  }, []);

  const install = useCallback(async () => {
    if (!installEvent) return false;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') setInstallEvent(null);
    return outcome === 'accepted';
  }, [installEvent]);

  const dismissInstallBanner = () => {
    setInstallBannerDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const value = useMemo<PwaContextValue>(
    () => ({
      needRefresh,
      updateApp,
      canInstall: Boolean(installEvent) && !isStandalone,
      install,
      promptInstall: install,
      isStandalone,
      isIos,
      isOffline,
    }),
    [needRefresh, updateApp, installEvent, install, isStandalone, isIos, isOffline],
  );

  const showInstallBanner = value.canInstall && !installBannerDismissed;

  return (
    <PwaContext.Provider value={value}>
      {children}

      {/* Faixa de offline */}
      {isOffline && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-[260] pt-safe bg-warning text-stone-950 text-[11px] font-bold text-center py-1 flex items-center justify-center gap-1.5 shadow-md animate-in slide-in-from-top-2 duration-200"
        >
          <WifiOff className="w-3.5 h-3.5" />
          Você está offline — mostrando dados salvos no aparelho.
        </div>
      )}

      {/* Nova versão disponível */}
      {needRefresh && (
        <div
          role="alertdialog"
          aria-label="Atualização disponível"
          className="fixed z-[270] left-3 right-3 sm:left-auto sm:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 sm:w-[22rem] ui-card p-4 flex items-start gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <div className="w-10 h-10 rounded-xl bg-brand-soft border border-brand-line text-brand-text flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-fg">Nova versão disponível</p>
            <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">
              Atualize para receber as últimas melhorias e correções.
            </p>
            <div className="mt-2.5 flex gap-2">
              <ActionButton variant="primary" icon={RefreshCw} onClick={() => void updateApp()}>
                Atualizar agora
              </ActionButton>
              <ActionButton variant="light" onClick={() => setNeedRefresh(false)}>
                Depois
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* Sugestão de instalação (uma vez) */}
      {showInstallBanner && !needRefresh && (
        <div
          role="dialog"
          aria-label="Instalar aplicativo"
          className="fixed z-[270] left-3 right-3 sm:left-auto sm:right-6 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-6 sm:w-[22rem] ui-card p-4 flex items-start gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-300"
        >
          <img src="/icons/icon-192.png" alt="" className="w-11 h-11 rounded-xl shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-fg">Instalar o LouvorHub</p>
            <p className="text-[11px] text-fg-muted mt-0.5 leading-snug">
              Acesso rápido na tela inicial, tela cheia e funciona sem internet.
            </p>
            <div className="mt-2.5 flex gap-2">
              <ActionButton
                variant="primary"
                icon={Download}
                onClick={() => {
                  void install().then((ok) => {
                    if (!ok) dismissInstallBanner();
                  });
                }}
              >
                Instalar
              </ActionButton>
              <ActionButton variant="light" onClick={dismissInstallBanner}>
                Agora não
              </ActionButton>
            </div>
          </div>
          <ActionButton
            variant="light"
            icon={X}
            onClick={dismissInstallBanner}
            aria-label="Fechar"
            title="Fechar"
            className="-mr-1.5 -mt-1.5"
          />
        </div>
      )}
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const ctx = useContext(PwaContext);
  if (!ctx) throw new Error('usePwa deve ser usado dentro de PwaProvider');
  return ctx;
}
