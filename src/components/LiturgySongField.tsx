import React, { useMemo, useRef, useState } from 'react';
import { Link2, Lock, X } from 'lucide-react';
import type { Song } from '@/types';
import { Input, cn } from './ui';

const MAX_RESULTS = 8;

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const liturgySongLabel = (song: Song) =>
  `${song.songType === 'hino' && song.number ? `#${song.number} · ` : ''}${song.title}`;

interface LiturgySongFieldProps {
  songs: Song[];
  title: string;
  songId?: string;
  onChange: (patch: { title: string; songId?: string }) => void;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Nome da música do momento: texto livre (música fora do catálogo) ou vínculo com o catálogo.
 * Com vínculo, o nome vem da música e não é editável.
 */
export const LiturgySongField: React.FC<LiturgySongFieldProps> = ({
  songs,
  title,
  songId,
  onChange,
  autoFocus,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const linked = songId ? songs.find((s) => s.id === songId) : undefined;

  const results = useMemo(() => {
    const q = normalize(title);
    if (!q) return [];
    const num = /^#?\d+$/.test(q) ? q.replace('#', '') : null;
    return songs
      .filter((s) => (num ? String(s.number ?? '') === num : normalize(s.title).includes(q)))
      .sort((a, b) => Number(!normalize(b.title).startsWith(q)) - Number(!normalize(a.title).startsWith(q)))
      .slice(0, MAX_RESULTS);
  }, [songs, title]);

  const link = (song: Song) => {
    onChange({ title: song.title, songId: song.id });
    setOpen(false);
  };

  const unlink = () => {
    onChange({ title: linked?.title ?? title, songId: undefined });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  if (linked) {
    return (
      <div
        className={cn(
          'ui-input h-9 py-0 flex items-center gap-2 bg-brand-soft/60 border-brand-line cursor-default',
          className,
        )}
        title="Vinculada ao catálogo: o nome vem da música"
      >
        <Link2 className="w-3.5 h-3.5 shrink-0 text-brand-text" aria-hidden />
        <span className="flex-1 min-w-0 truncate text-sm font-semibold text-fg">{liturgySongLabel(linked)}</span>
        <Lock className="w-3 h-3 shrink-0 text-fg-subtle" aria-label="Nome bloqueado" />
        <button
          type="button"
          onClick={unlink}
          className="-mr-1.5 w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-fg-subtle hover:text-danger-text hover:bg-danger-soft"
          aria-label="Desvincular do catálogo"
          title="Desvincular do catálogo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const showMenu = open && results.length > 0;

  return (
    <div className={cn('relative', className)}>
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => {
          onChange({ title: e.target.value, songId: undefined });
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (!showMenu) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => (h + 1) % results.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => (h - 1 + results.length) % results.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            link(results[highlight]);
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        placeholder="Nome da música (busque no catálogo ou digite)"
        aria-label="Nome da música"
        aria-autocomplete="list"
        aria-expanded={showMenu}
        autoFocus={autoFocus}
        className="h-9 py-0 text-sm font-semibold"
      />
      {showMenu && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-40 max-h-72 overflow-y-auto rounded-xl border border-line bg-surface shadow-card-lg p-1"
        >
          {results.map((song, i) => (
            <li key={song.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => link(song)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2',
                  i === highlight ? 'bg-surface-2 text-fg' : 'text-fg-muted',
                )}
              >
                <span className="w-10 shrink-0 font-mono text-xs text-brand-text">
                  {song.songType === 'hino' && song.number ? `#${song.number}` : '♪'}
                </span>
                <span className="truncate flex-1">{song.title}</span>
              </button>
            </li>
          ))}
          <li className="px-3 pt-2 pb-1 text-[11px] text-fg-subtle border-t border-line mt-1">
            Escolha para vincular ao catálogo, ou continue digitando para usar só o nome.
          </li>
        </ul>
      )}
    </div>
  );
};
