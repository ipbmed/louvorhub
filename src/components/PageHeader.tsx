import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
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
}) => {
  return (
    <div className="bg-stone-900 border border-emerald-900/40 light:border-stone-200 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-xl light:shadow-sm flex flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="w-9 h-9 sm:w-12 sm:h-12 shrink-0 rounded-xl sm:rounded-2xl bg-emerald-500/20 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 flex items-center justify-center border border-emerald-500/30 light:border-emerald-200">
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-2xl font-display font-bold text-emerald-100 light:text-stone-900 leading-tight tracking-tight truncate">
            {title}
          </h2>
          {description != null && description !== '' && (
            <div className="hidden sm:block text-xs text-stone-400 light:text-stone-500 mt-0.5 leading-relaxed">
              {description}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
