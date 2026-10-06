import React from 'react';
import { Heart } from 'lucide-react';
import type { Song } from '../types';
import { stripChords } from '../utils/chordTransposer';
import { cn } from './ui/cn';

interface SongPaneItemProps {
  song: Song;
  selected: boolean;
  isFavorite: boolean;
  onSelect: (song: Song) => void;
}

function firstLyricLine(lyrics: string): string {
  for (const raw of lyrics.split('\n')) {
    const line = stripChords(raw).trim();
    if (!line || line.startsWith('[') || line.startsWith('#') || line.startsWith('{')) continue;
    return line;
  }
  return '';
}

/** Linha compacta da lista do catálogo dividido (estilo lista de conversas). */
export const SongPaneItem: React.FC<SongPaneItemProps> = ({ song, selected, isFavorite, onSelect }) => {
  const isHino = (song.songType || (song.number ? 'hino' : 'cantico')) === 'hino';
  const snippet = firstLyricLine(song.lyrics || '') || song.author || song.category || '';

  return (
    <button
      type="button"
      onClick={() => onSelect(song)}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left !rounded-xl transition-colors',
        selected ? 'bg-brand-soft' : 'hover:bg-surface-2',
      )}
    >
      <span
        className={cn(
          'w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-extrabold tabular-nums',
          isHino && song.number != null ? 'text-sm' : 'text-[11px]',
          selected
            ? 'btn-gradient'
            : isHino && song.number != null
              ? 'bg-brand-soft text-brand-text'
              : 'bg-[color-mix(in_srgb,#0d9488_14%,transparent)] text-[#0d9488]',
        )}
      >
        {isHino && song.number != null ? song.number : 'CÂNT'}
      </span>
      <span className="min-w-0 flex-1 border-b border-line/70 pb-2.5 -mb-2.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-[15px] font-semibold', selected ? 'text-brand-text' : 'text-fg')}>
            {song.title}
          </span>
          {song.originalKey && (
            <span className="shrink-0 text-[11px] font-semibold text-fg-subtle">{song.originalKey}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5 mt-0.5">
          <span className="truncate text-[13px] text-fg-muted">{snippet}</span>
          {isFavorite && <Heart className="w-3.5 h-3.5 shrink-0 fill-rose-500 text-rose-500 ml-auto" />}
        </span>
      </span>
    </button>
  );
};
