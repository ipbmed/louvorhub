import React from 'react';
import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from './cn';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'danger'
  | 'danger-soft'
  | 'brand-soft';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-gradient border-transparent font-bold',
  secondary:
    'bg-muted text-fg hover:bg-muted-hover border-line-strong/60 font-semibold',
  ghost:
    'bg-transparent text-fg-muted hover:text-fg hover:bg-muted border-transparent font-semibold',
  outline:
    'bg-transparent text-fg hover:bg-muted border-line-strong font-semibold',
  danger:
    'bg-danger text-white hover:brightness-110 border-transparent shadow-sm font-bold',
  'danger-soft':
    'bg-danger-soft text-danger-text hover:brightness-110 border-danger-line font-semibold',
  'brand-soft':
    'bg-brand-soft text-brand-text hover:bg-brand hover:text-brand-fg border-brand-line font-semibold',
};

const SIZE: Record<ButtonSize, string> = {
  xs: 'min-h-8 px-2.5 text-[11px] gap-1 [&_svg]:w-3.5 [&_svg]:h-3.5',
  sm: 'min-h-9 px-3 text-xs gap-1.5 [&_svg]:w-4 [&_svg]:h-4',
  md: 'min-h-10 px-4 text-sm gap-2 [&_svg]:w-4 [&_svg]:h-4',
  lg: 'min-h-12 px-5 text-base gap-2 [&_svg]:w-5 [&_svg]:h-5',
};

const ICON_SIZE: Record<ButtonSize, string> = {
  xs: 'w-8 h-8 [&_svg]:w-3.5 [&_svg]:h-3.5',
  sm: 'w-9 h-9 [&_svg]:w-4 [&_svg]:h-4',
  md: 'w-10 h-10 [&_svg]:w-5 [&_svg]:h-5',
  lg: 'w-12 h-12 [&_svg]:w-6 [&_svg]:h-6',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}

/** Botão padrão da aplicação. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon: Icon,
      iconRight: IconRight,
      loading = false,
      block = false,
      className,
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-full border transition-all touch-manipulation select-none whitespace-nowrap',
        'disabled:opacity-55 disabled:pointer-events-none active:scale-[0.98]',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" aria-hidden />
      ) : Icon ? (
        <Icon className="shrink-0" aria-hidden />
      ) : null}
      {children != null && children !== '' && <span className="truncate">{children}</span>}
      {IconRight && !loading && <IconRight className="shrink-0" aria-hidden />}
    </button>
  ),
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  /** Obrigatório para acessibilidade. */
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  active?: boolean;
}

/** Botão só com ícone (quadrado), com tooltip/aria-label obrigatórios. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      label,
      variant = 'secondary',
      size = 'md',
      loading = false,
      active = false,
      className,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      title={label}
      aria-label={label}
      aria-pressed={active || undefined}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-button border transition-all touch-manipulation shrink-0',
        'disabled:opacity-55 disabled:pointer-events-none active:scale-[0.96]',
        active ? VARIANT['brand-soft'] : VARIANT[variant],
        ICON_SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Icon aria-hidden />}
    </button>
  ),
);
IconButton.displayName = 'IconButton';
