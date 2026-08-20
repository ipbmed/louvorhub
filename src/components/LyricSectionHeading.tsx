import React from 'react';

interface LyricSectionHeadingProps {
  label: string;
  annotation?: string;
  className?: string;
}

/** Nome da seção em caixa alta + anotação visível (ex.: Refrão: 2x). */
export const LyricSectionHeading: React.FC<LyricSectionHeadingProps> = ({
  label,
  annotation,
  className = '',
}) => (
  <span className={className}>
    <span className="uppercase tracking-wider">{label}</span>
    {annotation ? (
      <span className="normal-case tracking-normal font-semibold">: {annotation}</span>
    ) : null}
  </span>
);
