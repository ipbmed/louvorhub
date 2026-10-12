import React, { useId } from 'react';
import { cn } from './cn';

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  /** Recebe o id gerado para associar ao controle. */
  children: (id: string, describedBy?: string) => React.ReactNode;
}

/** Rótulo + controle + ajuda/erro, com ids acessíveis. */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  className,
  children,
}) => {
  const id = useId();
  const helpId = hint || error ? `${id}-help` : undefined;
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <label htmlFor={id} className="ui-label">
          {label}
          {required && <span className="text-brand-text ml-0.5">*</span>}
        </label>
      )}
      {children(id, helpId)}
      {(error || hint) && (
        <p
          id={helpId}
          className={cn(
            'mt-1.5 text-[11px] leading-snug',
            error ? 'text-danger-text font-medium' : 'text-fg-subtle',
          )}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('ui-input', className)}
      {...rest}
    />
  ),
);
Input.displayName = 'Input';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 3, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn('ui-input resize-y min-h-[5.5rem]', className)}
      {...rest}
    />
  ),
);
Textarea.displayName = 'Textarea';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean };

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...rest }, ref) => (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn('ui-input pr-9 appearance-none bg-no-repeat', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundPosition: 'right 0.75rem center',
      }}
      {...rest}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';
