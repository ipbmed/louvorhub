import React from 'react';
import { Hash, Layers, Music2 } from 'lucide-react';
import { cn } from './ui/cn';

export type SongTypeMode = 'todos' | 'hino' | 'cantico';

interface SongTypeFilterProps {
  showHinos: boolean;
  showCanticos: boolean;
  onChange: (mode: SongTypeMode) => void;
  /** Ocupa toda a largura, com os três botões do mesmo tamanho. */
  fullWidth?: boolean;
  className?: string;
}

const OPTIONS = [
  { mode: 'todos', label: 'Todos', Icon: Layers },
  { mode: 'hino', label: 'Hinos', Icon: Hash },
  { mode: 'cantico', label: 'Cânticos', Icon: Music2 },
] as const;

export function songTypeModeOf(showHinos: boolean, showCanticos: boolean): SongTypeMode {
  if (showHinos && !showCanticos) return 'hino';
  if (showCanticos && !showHinos) return 'cantico';
  return 'todos';
}

/** Seletor do tipo de louvor: todos, só hinos ou só cânticos. */
export const SongTypeFilter: React.FC<SongTypeFilterProps> = ({
  showHinos,
  showCanticos,
  onChange,
  fullWidth = false,
  className,
}) => {
  const current = songTypeModeOf(showHinos, showCanticos);
  return (
    <div
      className={cn(
        'items-center bg-muted border border-line rounded-xl p-0.5',
        fullWidth ? 'grid grid-cols-3 w-full' : 'flex shrink-0',
        className,
      )}
      role="radiogroup"
      aria-label="Tipo de louvor"
    >
      {OPTIONS.map(({ mode, label, Icon }) => {
        const active = current === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(mode)}
            className={cn(
              'flex items-center justify-center gap-1.5 min-h-8 !rounded-lg text-xs font-semibold transition-all touch-manipulation',
              fullWidth ? 'min-w-0 px-1.5 xs:px-2.5' : 'min-w-9 px-2.5',
              active ? 'bg-brand text-brand-fg shadow-sm' : 'text-fg-muted hover:text-fg',
            )}
          >
            <Icon className={cn('w-3.5 h-3.5 shrink-0', fullWidth && 'max-[22.5rem]:hidden')} />
            <span className={cn(fullWidth ? 'min-w-0 truncate' : 'hidden sm:inline')}>{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export function resolveSongType(song: { songType?: string; number?: number | null }): 'hino' | 'cantico' {
  return (song.songType || (song.number != null ? 'hino' : 'cantico')) as 'hino' | 'cantico';
}

export function matchesSongTypeFilter(
  song: { songType?: string; number?: number | null },
  showHinos: boolean,
  showCanticos: boolean,
): boolean {
  const type = resolveSongType(song);
  if (type === 'hino') return showHinos;
  return showCanticos;
}
