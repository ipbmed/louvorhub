import React from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Button, IconButton, type ButtonProps } from './ui/Button';
import { cn } from './ui/cn';

export interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Mostra o botão de voltar à esquerda do título. */
  onBack?: () => void;
  backLabel?: string;
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
  /** Em tela grande, vira barra fixa colada ao topo (largura total, padding reduzido). */
  bar?: boolean;
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

/** Cabeçalho padronizado das views internas: título, subtítulo, voltar e ações. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  actions,
  onBack,
  backLabel = 'Voltar',
  onIconClick,
  iconTitle,
  iconBadge: BadgeIcon,
  onTitleClick,
  titleTitle,
  children,
  bar = false,
  className,
}) => {
  const iconClassName = cn(
    'relative hidden sm:flex w-11 h-11 shrink-0 rounded-[14px] bg-brand-soft text-brand-text items-center justify-center',
    bar && 'lg:w-9 lg:h-9 lg:rounded-xl',
  );

  const iconInner = Icon ? (
    <>
      <Icon className="w-5 h-5" />
      {BadgeIcon && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-brand-fg flex items-center justify-center ring-2 ring-app shadow-sm">
          <BadgeIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
        </span>
      )}
    </>
  ) : null;

  const titleClassName = cn(
    'text-[22px] sm:text-2xl font-extrabold text-fg leading-tight tracking-tight truncate',
    bar && 'lg:text-xl',
  );

  return (
    <div
      className={cn(
        'w-full',
        // Fundo e borda inferior estendidos até as bordas da janela sem gerar rolagem horizontal.
        bar &&
          'lg:sticky lg:top-0 lg:z-20 lg:-mt-8 lg:-mx-8 lg:w-auto lg:px-8 lg:py-2.5 lg:bg-surface lg:[clip-path:inset(0_-100vmax_-1px)] lg:shadow-[0_0_0_100vmax_var(--surface),0_1px_0_100vmax_var(--line)]',
        className,
      )}
    >
      <div className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <IconButton
              icon={ArrowLeft}
              label={backLabel}
              variant="ghost"
              onClick={onBack}
              className={cn('-ml-1 bg-surface shadow-card', bar && 'lg:w-9 lg:h-9 lg:ml-0')}
            />
          )}
          {Icon &&
            (!onBack || bar) &&
            (onIconClick ? (
              <button
                type="button"
                onClick={onIconClick}
                title={iconTitle}
                aria-label={iconTitle || 'Ação'}
                className={cn(iconClassName, 'hover:brightness-95 transition')}
              >
                {iconInner}
              </button>
            ) : (
              <div className={iconClassName}>{iconInner}</div>
            ))}
          <div className="min-w-0 pr-1">
            {onTitleClick ? (
              <button
                type="button"
                onClick={onTitleClick}
                title={titleTitle || title}
                className={cn(titleClassName, 'block text-left hover:opacity-80 transition-opacity max-w-full')}
              >
                {title}
              </button>
            ) : (
              <h1 className={titleClassName}>{title}</h1>
            )}
            {description != null && description !== '' && (
              <div
                className={cn(
                  'text-[13px] sm:text-sm text-fg-muted mt-0.5 leading-snug line-clamp-2',
                  bar && 'lg:text-[13px] lg:mt-0 lg:line-clamp-1',
                )}
              >
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

const SHELL_WIDTHS = {
  narrow: 'max-w-3xl',
  wide: 'max-w-7xl',
  full: '',
} as const;

interface PageShellProps extends Omit<PageHeaderProps, 'bar' | 'children' | 'className'> {
  /** Conteúdo abaixo do título dentro da barra (abas, filtros). */
  headerContent?: React.ReactNode;
  /** Largura máxima do conteúdo (centralizado); a barra ocupa sempre a largura total. */
  width?: keyof typeof SHELL_WIDTHS;
  /** Oculta a barra (ex.: view embutida em outra página). */
  hideHeader?: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * Página interna padrão: cabeçalho em barra colada ao topo (tela grande)
 * e conteúdo com espaçamento externo reduzido.
 */
export const PageShell: React.FC<PageShellProps> = ({
  headerContent,
  width = 'wide',
  hideHeader = false,
  className,
  contentClassName,
  children,
  ...header
}) => (
  <div className={cn('w-full space-y-4 lg:space-y-3 animate-in fade-in duration-300', className)}>
    {!hideHeader && (
      <PageHeader bar {...header}>
        {headerContent}
      </PageHeader>
    )}
    <div className={cn(!hideHeader && 'lg:-mx-4')}>
      <div className={cn('mx-auto w-full space-y-4', SHELL_WIDTHS[width], contentClassName)}>{children}</div>
    </div>
  </div>
);
