import React from 'react';

type SongMetaBadgeVariant =
  | 'number'
  | 'cantico'
  | 'category'
  | 'hymnal'
  | 'eventVersion'
  | 'unreviewed'
  | 'meta';

interface SongMetaBadgeProps {
  variant: SongMetaBadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/** Tamanho do chip “Novo Cântico” original — base para todos os badges. */
export const songMetaBadgeSizeClass = 'px-2 py-0.5 text-[10px] font-medium';

const chipBase = `inline-flex items-center shrink-0 rounded-full border leading-none gap-1 ${songMetaBadgeSizeClass}`;

const variantTone: Record<SongMetaBadgeVariant, string> = {
  number:
    'font-mono font-bold bg-emerald-500/10 light:bg-emerald-50 border-emerald-500/30 light:border-emerald-200 text-emerald-300 light:text-emerald-800',
  cantico:
    'font-mono uppercase tracking-wide bg-teal-500/10 light:bg-teal-50 border-teal-500/30 light:border-teal-200 text-teal-300 light:text-teal-800',
  category:
    'uppercase tracking-wider bg-stone-800/80 light:bg-stone-100 border-stone-700/80 light:border-stone-200 text-emerald-200/90 light:text-emerald-800',
  hymnal:
    'bg-emerald-950/80 light:bg-emerald-50 border-emerald-800/60 light:border-emerald-200 text-emerald-300 light:text-emerald-800',
  eventVersion:
    'bg-amber-500/15 light:bg-amber-50 border-amber-500/40 light:border-amber-300 text-amber-200 light:text-amber-900',
  unreviewed:
    'bg-amber-500/15 light:bg-amber-50 border-amber-500/40 light:border-amber-300 text-amber-200 light:text-amber-900',
  meta: 'font-mono bg-stone-800/80 light:bg-stone-100 border-stone-700/80 light:border-stone-200 text-stone-300 light:text-stone-700',
};

/** Badge padronizado para metadados de música (cards, lista e modal). */
export const SongMetaBadge: React.FC<SongMetaBadgeProps> = ({
  variant,
  icon,
  children,
  className = '',
}) => {
  const styles = `${chipBase} ${variantTone[variant]}`;

  return (
    <span className={className ? `${styles} ${className}` : styles}>
      {icon ? (
        <span className="inline-flex shrink-0 [&>svg]:w-2.5 [&>svg]:h-2.5">{icon}</span>
      ) : null}
      {children}
    </span>
  );
};
