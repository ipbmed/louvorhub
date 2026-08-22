import React, { useMemo } from 'react';
import { Song } from '../types';
import { BookA, X } from 'lucide-react';

interface AlphabetFilterProps {
  selectedLetter: string; // 'TODAS' | 'A' | 'B' | ... | '#'
  onSelectLetter: (letter: string) => void;
  songs: Song[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '#',
] as const;

function getNormalizedFirstChar(title: string): string {
  if (!title) return '#';
  const trimmed = title.trim();
  if (!trimmed) return '#';
  const first = trimmed[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  return '#';
}

function useLetterCounts(songs: Song[]) {
  return useMemo(() => {
    const counts: Record<string, number> = { TODAS: songs.length };
    LETTERS.forEach((letter) => {
      counts[letter] = 0;
    });
    songs.forEach((song) => {
      const char = getNormalizedFirstChar(song.title);
      if (counts[char] !== undefined) {
        counts[char]++;
      } else {
        counts['#']++;
      }
    });
    return counts;
  }, [songs]);
}

const letterButtonClass = (hasSongs: boolean, isSelected: boolean) =>
  `min-h-10 sm:min-h-9 rounded-button text-xs font-bold transition-all flex items-center justify-center border touch-manipulation ${
    isSelected
      ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-extrabold shadow-md shadow-emerald-500/20'
      : hasSongs
        ? 'bg-stone-800/90 light:bg-stone-100 text-stone-200 light:text-stone-800 border-stone-700/80 light:border-stone-200 active:bg-stone-700 hover:bg-stone-700 light:hover:bg-emerald-50 hover:text-white light:hover:text-emerald-800 hover:border-emerald-500/50 light:hover:border-emerald-300'
        : 'bg-stone-950/40 light:bg-stone-50 text-stone-600 light:text-stone-300 border-stone-900/60 light:border-stone-200/60 opacity-40 cursor-not-allowed'
  }`;

/** Botão para abrir/fechar o índice alfabético (ao lado de Cards / Lista). */
export const AlphabetFilterToggle: React.FC<{
  expanded: boolean;
  onToggle: () => void;
  selectedLetter: string;
}> = ({ expanded, onToggle, selectedLetter }) => {
  const hasFilter = selectedLetter !== 'TODAS';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label="Índice alfabético"
      title="Índice alfabético"
      className={`relative flex items-center justify-center gap-1.5 min-h-9 min-w-9 sm:min-w-0 px-2 sm:px-2.5 py-1.5 rounded-button font-semibold transition-all touch-manipulation border ${
        expanded || hasFilter
          ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-sm'
          : 'bg-stone-800/80 light:bg-stone-100 text-stone-300 light:text-stone-700 border-stone-700 light:border-stone-200 hover:bg-stone-700/80 light:hover:bg-stone-200'
      }`}
    >
      <BookA className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">Índice</span>
      {hasFilter && !expanded && (
        <span className="sm:ml-0.5 absolute -top-1 -right-1 sm:static min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-stone-950/25 sm:bg-stone-950/20 text-[9px] sm:text-[10px] font-extrabold flex items-center justify-center">
          {selectedLetter}
        </span>
      )}
    </button>
  );
};

/** Painel expandível com o grid de letras. */
export const AlphabetFilter: React.FC<AlphabetFilterProps> = ({
  selectedLetter,
  onSelectLetter,
  songs,
  expanded,
  onExpandedChange,
}) => {
  const letterCounts = useLetterCounts(songs);

  if (!expanded) return null;

  const selectLetter = (letter: string) => {
    onSelectLetter(letter);
    onExpandedChange(false);
  };

  const summaryLabel =
    selectedLetter === 'TODAS'
      ? 'Todas as músicas'
      : `Letra "${selectedLetter}"`;

  const summaryCount =
    selectedLetter === 'TODAS'
      ? letterCounts.TODAS
      : letterCounts[selectedLetter] || 0;

  return (
    <div className="pt-3 mt-3 border-t border-stone-800/80 light:border-stone-200 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-800 light:border-stone-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-800 flex items-center justify-center border border-emerald-500/30 light:border-emerald-200">
            <BookA className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold text-emerald-100 light:text-stone-900 tracking-tight">
              Índice Alfabético
            </h3>
            <p className="text-xs text-stone-400 light:text-stone-500 mt-0.5">
              {summaryLabel}
              <span className="font-mono ml-1 opacity-80">({summaryCount})</span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onExpandedChange(false)}
          className="shrink-0 p-1.5 text-stone-400 hover:text-stone-100 light:hover:text-stone-800 rounded-button"
          title="Fechar índice"
          aria-label="Fechar índice alfabético"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => selectLetter('TODAS')}
          className={`flex-1 min-h-10 sm:min-h-9 px-3 rounded-button text-xs font-bold border touch-manipulation ${
            selectedLetter === 'TODAS'
              ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md shadow-emerald-500/20'
              : 'bg-stone-800/90 light:bg-stone-100 text-stone-200 light:text-stone-800 border-stone-700/80 light:border-stone-200 active:bg-stone-700 light:hover:bg-stone-200'
          }`}
        >
          Todas as músicas
          <span className="ml-1.5 font-mono text-[10px] opacity-70">
            ({letterCounts.TODAS})
          </span>
        </button>

        {selectedLetter !== 'TODAS' && (
          <button
            type="button"
            onClick={() => selectLetter('TODAS')}
            className="min-h-10 sm:min-h-9 px-2.5 bg-stone-800 light:bg-stone-100 hover:bg-stone-700 light:hover:bg-stone-200 text-stone-300 light:text-stone-700 rounded-button text-[11px] font-bold border border-stone-700 light:border-stone-200 shrink-0 touch-manipulation flex items-center gap-1"
            title="Limpar filtro"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5"
        role="group"
        aria-label="Filtrar por letra inicial"
      >
        {LETTERS.map((letter) => {
          const count = letterCounts[letter] || 0;
          const isSelected = selectedLetter === letter;
          const hasSongs = count > 0;

          return (
            <button
              key={letter}
              type="button"
              disabled={!hasSongs}
              onClick={() => selectLetter(letter)}
              className={letterButtonClass(hasSongs, isSelected)}
              title={
                hasSongs
                  ? `Títulos iniciados com "${letter}" (${count})`
                  : `Nenhum título com "${letter}"`
              }
              aria-pressed={isSelected}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
};
