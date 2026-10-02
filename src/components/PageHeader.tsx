import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, type ButtonProps } from './ui/Button';
import { cn } from './ui/cn';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Quando definido, o ícone vira botão clicável. */
  onIconClick?: () => void;
  iconTitle?: string;
  /** Ícone pequeno no canto (ex.: lápis de editar). */
  iconBadge?: LucideIcon;
  /** Clique no título (ex.: ir para Início). */
  onTitleClick?: () => void;
  titleTitle?: string;
  /** Conteúdo abaixo do título (abas, filtros). */
  children?: React.ReactNode;
  className?: string;
}

interface PageHeaderButtonProps extends Omit<ButtonProps, 'variant' | 'icon'> {
  icon: LucideIcon;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

/** Botão padronizado do cabeçalho das views internas. */
export const PageHeaderButton: React.FC<PageHeaderButtonProps> = ({
  icon,
  variant = 'primary',
  children,
  className,
  ...props
}) => (
  <Button
    icon={icon}
    size="sm"
    variant={variant === 'primary' ? 'primary' : 'secondary'}
    className={cn('sm:min-h-10 sm:px-4 sm:text-sm', className)}
    {...props}
  >
    {children}
  </Button>
);

/** Cabeçalho padronizado das views internas (painel, playlists, igrejas, etc.). */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  actions,
  onIconClick,
  iconTitle,
  iconBadge: BadgeIcon,
  onTitleClick,
  titleTitle,
  children,
  className,
}) => {
  const iconClassName =
    'relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-2xl bg-brand-soft text-brand-text flex items-center justify-center border border-brand-line';

  const iconInner = (
    <>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      {BadgeIcon && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem] rounded-full bg-brand text-brand-fg flex items-center justify-center ring-2 ring-surface shadow-sm">
          <BadgeIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
        </span>
      )}
    </>
  );

  const titleClassName =
    'text-lg sm:text-2xl font-display font-bold text-fg leading-tight tracking-tight truncate';

  return (
    <div
      className={cn(
        'w-full bg-surface border-b border-line px-3 sm:px-6 lg:px-8 py-3 sm:py-4',
        className,
      )}
    >
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onIconClick ? (
            <button
              type="button"
              onClick={onIconClick}
              title={iconTitle}
              aria-label={iconTitle || 'Ação'}
              className={cn(iconClassName, 'hover:brightness-110 transition')}
            >
              {iconInner}
            </button>
          ) : (
            <div className={iconClassName}>{iconInner}</div>
          )}
          <div className="min-w-0 pr-2">
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                title={titleTitle || title}
                className={cn(titleClassName, 'text-left hover:opacity-80 transition-opacity max-w-full')}
              >
                {title}
              </button>
            ) : (
              <h2 className={titleClassName}>{title}</h2>
            )}
            {description != null && description !== '' && (
              <div className="hidden sm:block text-xs text-fg-muted mt-0.5 leading-relaxed">
                {description}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-wrap justify-end shrink-0 self-center">
            {actions}
          </div>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
};
