import React from 'react';
import type { LucideIcon } from 'lucide-react';

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
}

const primaryClassName =
  'px-3 py-2 sm:px-4 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all shrink-0';

const secondaryClassName =
  'px-3 py-2 sm:px-4 sm:py-2.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-emerald-300 light:text-emerald-800 rounded-button border border-stone-700 light:border-stone-300 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0';

interface PageHeaderButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

/** Botão padronizado do cabeçalho das views internas. */
export const PageHeaderButton: React.FC<PageHeaderButtonProps> = ({
  icon: Icon,
  variant = 'primary',
  children,
  className,
  type = 'button',
  ...props
}) => {
  const base = variant === 'primary' ? primaryClassName : secondaryClassName;
  return (
    <button
      type={type}
      className={className ? `${base} ${className}` : base}
      {...props}
    >
      <Icon className="w-4 h-4" />
      <span className="inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
};

/** Cabeçalho padronizado das views internas (painel, repertórios, igrejas, etc.). */
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
}) => {
  const iconClassName =
    'relative w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-2xl bg-emerald-500/20 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 flex items-center justify-center border border-emerald-500/30 light:border-emerald-200 ml-2 sm:ml-3';

  const iconInner = (
    <>
      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      {BadgeIcon && (
        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-[1.125rem] sm:h-[1.125rem] rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center ring-2 ring-stone-900 light:ring-white shadow-sm">
          <BadgeIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
        </span>
      )}
    </>
  );

  const titleClassName =
    'text-lg sm:text-2xl font-display font-bold text-emerald-100 light:text-stone-900 leading-tight tracking-tight truncate';

  return (
    <div className="w-full bg-stone-900 border-y border-emerald-900/40 light:border-stone-200 rounded-none py-2 sm:py-2.5 px-0 shadow-none flex flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {onIconClick ? (
          <button
            type="button"
            onClick={onIconClick}
            title={iconTitle}
            aria-label={iconTitle || 'Ação'}
            className={`${iconClassName} hover:bg-emerald-500/30 light:hover:bg-emerald-100 transition-colors`}
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
              className={`${titleClassName} text-left hover:opacity-80 transition-opacity max-w-full`}
            >
              {title}
            </button>
          ) : (
            <h2 className={titleClassName}>{title}</h2>
          )}
          {description != null && description !== '' && (
            <div className="hidden sm:block text-xs text-stone-400 light:text-stone-500 mt-0.5 leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0 self-center pr-2 sm:pr-3">
          {actions}
        </div>
      )}
    </div>
  );
};
