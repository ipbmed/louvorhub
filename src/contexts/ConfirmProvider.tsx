import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, HelpCircle, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ActionButton } from '@/components/ui/Button';

export interface ConfirmOptions {
  title: React.ReactNode;
  /** Texto explicativo. `message` é um alias. */
  description?: React.ReactNode;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = ação destrutiva (botão vermelho). Padrão: danger. */
  tone?: 'danger' | 'warning' | 'brand';
  icon?: LucideIcon;
}

export type NotifyOptions = Omit<ConfirmOptions, 'cancelLabel'>;

/**
 * Função de confirmação. Substitui `window.confirm`:
 *   const ok = await confirm({ title: 'Excluir?', message: '...' });
 * Também expõe `confirm.notify(...)` para avisos de um botão (substitui `alert`).
 */
export type ConfirmFn = ((options: ConfirmOptions) => Promise<boolean>) & {
  notify: (options: NotifyOptions) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmFn | null>(null);

type PendingState = ConfirmOptions & { alertOnly: boolean };

const DEFAULT_ICON: Record<NonNullable<ConfirmOptions['tone']>, LucideIcon> = {
  danger: Trash2,
  warning: AlertTriangle,
  brand: HelpCircle,
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }, []);

  const confirmFn = useMemo<ConfirmFn>(() => {
    const confirm = ((options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        // Se já houver um diálogo aberto, cancela o anterior.
        resolverRef.current?.(false);
        resolverRef.current = resolve;
        setPending({ ...options, alertOnly: false });
      })) as ConfirmFn;
    confirm.notify = (options: NotifyOptions) =>
      new Promise<void>((resolve) => {
        resolverRef.current?.(false);
        resolverRef.current = () => resolve();
        setPending({ ...options, alertOnly: true });
      });
    return confirm;
  }, []);

  const tone = pending?.tone ?? (pending?.alertOnly ? 'warning' : 'danger');
  const Icon = pending?.icon ?? DEFAULT_ICON[tone];
  const description = pending?.description ?? pending?.message;

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      <Modal
        open={Boolean(pending)}
        onClose={() => settle(false)}
        size="sm"
        icon={Icon}
        tone={tone}
        title={pending?.title}
        hideClose
        zIndexClassName="z-[150]"
        footer={
          <>
            {!pending?.alertOnly && (
              <ActionButton variant="light" onClick={() => settle(false)}>
                {pending?.cancelLabel ?? 'Cancelar'}
              </ActionButton>
            )}
            <ActionButton
              variant={tone === 'danger' ? 'danger' : 'primary'}
              icon={tone === 'danger' ? Trash2 : Check}
              onClick={() => settle(true)}
              autoFocus
            >
              {pending?.confirmLabel ?? (pending?.alertOnly ? 'Entendi' : 'Confirmar')}
            </ActionButton>
          </>
        }
      >
        {description && <p className="text-sm text-fg-muted leading-relaxed">{description}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
}

/** Retorna a função `confirm` (com `confirm.notify`). */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm deve ser usado dentro de ConfirmProvider');
  return ctx;
}
