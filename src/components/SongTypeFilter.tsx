import React from 'react';
import { Hash, Music2 } from 'lucide-react';

interface SongTypeFilterProps {
  showHinos: boolean;
  showCanticos: boolean;
  onToggleHinos: () => void;
  onToggleCanticos: () => void;
}

/** Grupo para filtrar hinos e/ou cânticos (ambos ativos por padrão). */
export const SongTypeFilter: React.FC<SongTypeFilterProps> = ({
  showHinos,
  showCanticos,
  onToggleHinos,
  onToggleCanticos,
}) => (
  <div
    className="flex items-center shrink-0 bg-stone-800 light:bg-stone-100 border border-stone-700 light:border-stone-200 rounded-xl p-0.5"
    role="group"
    aria-label="Tipo de louvor"
  >
    <button
      type="button"
      onClick={onToggleHinos}
      aria-pressed={showHinos}
      aria-label="Hinos"
      className={`flex items-center justify-center gap-1.5 min-h-9 min-w-9 sm:min-w-0 px-2 sm:px-2.5 py-1.5 rounded-button font-semibold transition-all touch-manipulation ${
        showHinos
          ? 'bg-emerald-500 text-stone-950 shadow-sm'
          : 'text-stone-400 light:text-stone-600 hover:text-stone-200 light:hover:text-stone-900'
      }`}
      title={showHinos ? 'Ocultar hinos' : 'Mostrar hinos'}
    >
      <Hash className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">Hinos</span>
    </button>
    <button
      type="button"
      onClick={onToggleCanticos}
      aria-pressed={showCanticos}
      aria-label="Cânticos"
      className={`flex items-center justify-center gap-1.5 min-h-9 min-w-9 sm:min-w-0 px-2 sm:px-2.5 py-1.5 rounded-button font-semibold transition-all touch-manipulation ${
        showCanticos
          ? 'bg-emerald-500 text-stone-950 shadow-sm'
          : 'text-stone-400 light:text-stone-600 hover:text-stone-200 light:hover:text-stone-900'
      }`}
      title={showCanticos ? 'Ocultar cânticos' : 'Mostrar cânticos'}
    >
      <Music2 className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">Cânticos</span>
    </button>
  </div>
);

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
