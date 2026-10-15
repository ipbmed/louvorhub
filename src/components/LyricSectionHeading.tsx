import React from 'react';

interface LyricSectionHeadingProps {
  label: string;
  annotation?: string;
  className?: string;
}

/** Nome da seção em caixa alta + anotação visível (ex.: Refrão: 2x). Sem rótulo (`[OFF]`), não renderiza. */
export const LyricSectionHeading: React.FC<LyricSectionHeadingProps> = ({
  label,
  annotation,
  className = '',
}) => {
  if (!label && !annotation) return null;
  return (
    <span className={className}>
      {label && <span className="uppercase tracking-wider">{label}</span>}
      {annotation ? (
        <span className="normal-case tracking-normal font-semibold">
          {label ? ': ' : ''}
          {annotation}
        </span>
      ) : null}
    </span>
  );
};

/** Divisória de `[PARTE]`: linha horizontal com o nome no meio. */
export const LyricPartDivider: React.FC<{ label: string; annotation?: string; className?: string }> = ({
  label,
  annotation,
  className = '',
}) => (
  <div className={`flex items-center gap-3 ${className}`} role="separator" aria-label={label || 'Parte'}>
    <span className="h-px flex-1 bg-current opacity-25" />
    <LyricSectionHeading
      label={label}
      annotation={annotation}
      className="text-xs font-mono font-bold"
    />
    <span className="h-px flex-1 bg-current opacity-25" />
  </div>
);
