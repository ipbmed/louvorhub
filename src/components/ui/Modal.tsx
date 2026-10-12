import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';
import { ActionButton } from './Button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE: Record<ModalSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[min(96vw,80rem)]',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  /** Cor do bloco do ícone. */
  tone?: 'brand' | 'danger' | 'warning' | 'info' | 'neutral';
  size?: ModalSize;
  /** Rodapé fixo (botões de ação). */
  footer?: React.ReactNode;
  /** Ações extras no cabeçalho (antes do X). */
  headerActions?: React.ReactNode;
  /** Remove o padding do corpo para listas edge-to-edge. */
  flush?: boolean;
  /** Impede fechar por overlay/Escape (ex.: salvando). */
  locked?: boolean;
  hideClose?: boolean;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
  /** Permite z-index custom (ex.: modal sobre outro modal). */
  zIndexClassName?: string;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

const TONE: Record<NonNullable<ModalProps['tone']>, string> = {
  brand: 'bg-brand-soft text-brand-text border-brand-line',
  danger: 'bg-danger-soft text-danger-text border-danger-line',
  warning: 'bg-warning-soft text-warning-text border-warning-line',
  info: 'bg-info-soft text-info-text border-info-line',
  neutral: 'bg-muted text-fg-muted border-line',
};

let openModals = 0;

/**
 * Diálogo padrão: overlay com blur, painel centralizado no desktop e
 * "bottom sheet" no mobile. Fecha com Escape e clique no overlay.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  icon: Icon,
  tone = 'brand',
  size = 'md',
  footer,
  headerActions,
  flush = false,
  locked = false,
  hideClose = false,
  className,
  bodyClassName,
  children,
  zIndexClassName = 'z-50',
  initialFocusRef,
}) => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    openModals += 1;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !lockedRef.current) {
        e.stopPropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKey);

    const toFocus =
      initialFocusRef?.current ??
      panelRef.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), textarea, select, button:not([data-modal-close])',
      );
    const raf = requestAnimationFrame(() => toFocus?.focus?.());

    return () => {
      openModals = Math.max(0, openModals - 1);
      if (openModals === 0) document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const hasHeader = Boolean(title || Icon || headerActions || !hideClose);

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex items-end sm:items-center justify-center bg-overlay backdrop-blur-sm animate-in fade-in duration-150',
        zIndexClassName,
      )}
      onMouseDown={(e) => {
        if (locked) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'relative w-full flex flex-col bg-surface text-fg border border-line shadow-2xl',
          'rounded-t-3xl sm:rounded-3xl max-h-[92dvh] sm:max-h-[min(90dvh,56rem)]',
          'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
          'pb-safe sm:pb-0',
          SIZE[size],
          className,
        )}
      >
        {/* Alça do bottom sheet (mobile) */}
        <div className="sm:hidden flex justify-center pt-2.5 -mb-1">
          <span className="w-10 h-1 rounded-full bg-line-strong/70" />
        </div>

        {hasHeader && (
          <div className="shrink-0 flex items-start gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-line">
            {Icon && (
              <div
                className={cn(
                  'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                  TONE[tone],
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              {title && (
                <h2
                  id={titleId}
                  className="text-base sm:text-lg font-display font-bold text-fg leading-tight tracking-tight"
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-xs text-fg-muted mt-0.5 leading-snug">{subtitle}</p>
              )}
            </div>
            {headerActions}
            {!hideClose && (
              <ActionButton
                variant="light"
                icon={X}
                data-modal-close
                onClick={onClose}
                disabled={locked}
                aria-label="Fechar"
                title="Fechar"
              />
            )}
          </div>
        )}

        <div
          className={cn(
            'flex-1 min-h-0 overflow-y-auto overscroll-contain',
            !flush && 'px-4 sm:px-6 py-4 sm:py-5',
            bodyClassName,
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t border-line bg-surface-2/60 rounded-b-none sm:rounded-b-3xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
