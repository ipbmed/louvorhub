import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

export const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <Loader2 className={cn('w-5 h-5 text-brand-text animate-spin', className)} aria-hidden />
);

interface LoadingBlockProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  /** Altura mínima para ocupar a área útil e evitar "pulos". */
  tall?: boolean;
}

/** Bloco de carregamento com ícone, spinner e texto. */
export const LoadingBlock: React.FC<LoadingBlockProps> = ({
  title = 'Carregando…',
  subtitle,
  icon: Icon,
  className,
  tall = false,
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className={cn(
      'ui-card w-full flex flex-col items-center justify-center gap-3 px-4 py-10 text-center',
      tall && 'min-h-[min(60dvh,28rem)]',
      className,
    )}
  >
    {Icon && (
      <div className="w-12 h-12 rounded-2xl bg-brand-soft border border-brand-line text-brand-text flex items-center justify-center">
        <Icon className="w-6 h-6" />
      </div>
    )}
    <Spinner className="w-7 h-7" />
    <div className="space-y-0.5">
      <p className="text-sm font-semibold text-fg">{title}</p>
      {subtitle && <p className="text-[11px] text-fg-subtle">{subtitle}</p>}
    </div>
  </div>
);
