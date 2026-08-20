import React, { useState } from 'react';
import { Song } from '../types';
import { ChevronDown, X } from 'lucide-react';

interface AlphabetFilterProps {
  selectedLetter: string; // 'TODAS' | 'A' | 'B' | ... | '#'
  onSelectLetter: (letter: string) => void;
  songs: Song[]; // Passed to count available titles per letter
}

const LETTERS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  '#',
] as const;

export const AlphabetFilter: React.FC<AlphabetFilterProps> = ({
  selectedLetter,
  onSelectLetter,
  songs,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getNormalizedFirstChar = (title: string): string => {
    if (!title) return '#';
    const trimmed = title.trim();
    if (!trimmed) return '#';
    const first = trimmed[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (/[A-Z]/.test(first)) return first;
    return '#';
  };

  const letterCounts: Record<string, number> = { TODAS: songs.length };
  LETTERS.forEach((letter) => {
    letterCounts[letter] = 0;
  });

  songs.forEach((song) => {
    const char = getNormalizedFirstChar(song.title);
    if (letterCounts[char] !== undefined) {
      letterCounts[char]++;
    } else {
      letterCounts['#']++;
    }
  });

  const summaryLabel =
    selectedLetter === 'TODAS'
      ? 'Todas as músicas'
      : `Letra "${selectedLetter}"`;

  const summaryCount =
    selectedLetter === 'TODAS'
      ? letterCounts.TODAS
      : letterCounts[selectedLetter] || 0;

  const selectLetter = (letter: string) => {
    onSelectLetter(letter);
    setExpanded(false);
  };

  const letterButtonClass = (letter: string, hasSongs: boolean, isSelected: boolean) =>
    `min-h-10 sm:min-h-9 rounded-button text-xs font-bold transition-all flex items-center justify-center border touch-manipulation ${
      isSelected
        ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-extrabold shadow-md shadow-emerald-500/20'
        : hasSongs
          ? 'bg-stone-800/90 text-stone-200 border-stone-700/80 active:bg-stone-700 hover:bg-stone-700 hover:text-white hover:border-emerald-500/50'
          : 'bg-stone-950/40 text-stone-600 border-stone-900/60 opacity-40 cursor-not-allowed'
    }`;

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl sm:rounded-3xl shadow-lg overflow-hidden">
      {/* Linha compacta — clica para expandir; limpar quando filtrado */}
      <div className="flex items-center gap-1 px-2 sm:px-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex-1 flex items-center justify-between gap-3 px-1.5 py-3 text-left touch-manipulation hover:bg-stone-800/40 rounded-button transition-colors min-w-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-serif font-semibold text-stone-200">
                Índice Alfabético
              </p>
              <p className="text-[11px] text-stone-400 truncate mt-0.5">
                {summaryLabel}
                <span className="font-mono ml-1 opacity-70">({summaryCount})</span>
              </p>
            </div>
            {selectedLetter !== 'TODAS' && (
              <span className="w-7 h-7 shrink-0 rounded-button bg-emerald-500 text-stone-950 font-extrabold text-xs flex items-center justify-center">
                {selectedLetter}
              </span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-stone-400 shrink-0 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {!expanded && selectedLetter !== 'TODAS' && (
          <button
            type="button"
            onClick={() => onSelectLetter('TODAS')}
            className="shrink-0 min-h-9 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-[11px] font-bold border border-stone-700 touch-manipulation flex items-center gap-1"
            title="Limpar filtro alfabético"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4 space-y-3 border-t border-stone-800 pt-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => selectLetter('TODAS')}
              className={`flex-1 min-h-10 sm:min-h-9 px-3 rounded-button text-xs font-bold border touch-manipulation ${
                selectedLetter === 'TODAS'
                  ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-stone-800/90 text-stone-200 border-stone-700/80 active:bg-stone-700'
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
                className="min-h-10 sm:min-h-9 px-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-[11px] font-bold border border-stone-700 shrink-0 touch-manipulation flex items-center gap-1"
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
                  className={letterButtonClass(letter, hasSongs, isSelected)}
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
      )}
    </div>
  );
};
