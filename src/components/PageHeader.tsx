import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

const primaryClassName =
  'px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all shrink-0';

const secondaryClassName =
  'px-4 py-2.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-emerald-300 light:text-emerald-800 rounded-button border border-stone-700 light:border-stone-300 text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0';

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
    <div className="bg-stone-900 border border-emerald-900/40 light:border-stone-200 rounded-3xl p-6 shadow-xl light:shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 shrink-0 rounded-2xl bg-emerald-500/20 light:bg-emerald-50 text-emerald-400 light:text-emerald-700 flex items-center justify-center border border-emerald-500/30 light:border-emerald-200">
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-display font-bold text-emerald-100 light:text-stone-900 leading-tight tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-stone-400 light:text-stone-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-wrap shrink-0 w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
};
