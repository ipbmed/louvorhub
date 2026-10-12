import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from './cn';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  tone?: AlertTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const TONE: Record<AlertTone, { box: string; icon: React.ComponentType<{ className?: string }> }> = {
  info: { box: 'bg-info-soft border-info-line text-info-text', icon: Info },
  success: { box: 'bg-brand-soft border-brand-line text-brand-text', icon: CheckCircle2 },
  warning: { box: 'bg-warning-soft border-warning-line text-warning-text', icon: AlertTriangle },
  danger: { box: 'bg-danger-soft border-danger-line text-danger-text', icon: AlertCircle },
};

/** Mensagem inline (erro de formulário, aviso, dica). */
export const Alert: React.FC<AlertProps> = ({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
  className,
}) => {
  const { box, icon: Icon } = TONE[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed', box, className)}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5 opacity-90')}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar aviso"
          className="shrink-0 -mr-1 -mt-1 p-1 rounded-button opacity-70 hover:opacity-100"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
