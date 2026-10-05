import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'neutral' | 'brand' | 'danger';
  compact?: boolean;
  className?: string;
}

/** Estado vazio / erro padronizado para listas e páginas. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  compact = false,
  className,
}) => {
  const iconTone =
    tone === 'brand'
      ? 'bg-brand-soft text-brand-text border-brand-line'
      : tone === 'danger'
        ? 'bg-danger-soft text-danger-text border-danger-line'
        : 'bg-brand-soft text-brand-text border-transparent';
  return (
    <div
      className={cn(
        'ui-card flex flex-col items-center text-center',
        compact ? 'px-4 py-8 gap-2' : 'px-6 py-12 sm:py-16 gap-3 rounded-3xl',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-[20px] border flex items-center justify-center',
          compact ? 'w-12 h-12' : 'w-16 h-16',
          iconTone,
        )}
      >
        <Icon className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
      </div>
      <h3
        className={cn(
          'font-display font-bold text-fg tracking-tight',
          compact ? 'text-sm' : 'text-lg sm:text-xl',
        )}
      >
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-fg-muted max-w-md leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
};
