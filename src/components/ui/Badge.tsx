import React from 'react';
import { cn } from './cn';

type BadgeTone = 'neutral' | 'brand' | 'danger' | 'warning' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-muted text-fg-muted border-line',
  brand: 'bg-brand-soft text-brand-text border-brand-line',
  danger: 'bg-danger-soft text-danger-text border-danger-line',
  warning: 'bg-warning-soft text-warning-text border-warning-line',
  info: 'bg-info-soft text-info-text border-info-line',
};

/** Etiqueta pequena (status, contagem, categoria). */
export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', dot, className, children, ...rest }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap',
      TONE[tone],
      className,
    )}
    {...rest}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
    {children}
  </span>
);
