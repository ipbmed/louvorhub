import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronsUpDown, Search, X } from 'lucide-react';
import type { Song } from '@/types';

function songLabel(song: Song): string {
  return song.number != null
    ? `Hino #${song.number} — ${song.title}`
    : song.title;
}

interface SongSearchSelectProps {
  songs: Song[];
  value?: string;
  onChange: (songId: string) => void;
  placeholder?: string;
  className?: string;
}

type MenuPlacement = {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
};

export const SongSearchSelect: React.FC<SongSearchSelectProps> = ({
  songs,
  value = '',
  onChange,
  placeholder = 'Buscar música…',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPos, setMenuPos] = useState<MenuPlacement>({
    left: 0,
    width: 240,
    maxHeight: 240,
  });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => (value ? songs.find((s) => s.id === value) : undefined),
    [songs, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? songs
      : songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.number != null && String(s.number).includes(q)) ||
            (s.author && s.author.toLowerCase().includes(q)) ||
            (s.composer && s.composer.toLowerCase().includes(q)),
        );
    return list.slice(0, 80);
  }, [songs, query]);

  const updateMenuPos = () => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const preferBelow = spaceBelow >= 180 || spaceBelow >= spaceAbove;
    const maxHeight = Math.min(260, preferBelow ? spaceBelow : spaceAbove);
    setMenuPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 200) - 8)),
      width: Math.min(Math.max(rect.width, 200), window.innerWidth - 16),
      maxHeight: Math.max(140, maxHeight),
      ...(preferBelow
        ? { top: rect.bottom + 4 }
        : { bottom: window.innerHeight - rect.top + 4 }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onReposition = () => updateMenuPos();
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 min-w-0 bg-stone-900 border border-emerald-500/40 rounded-lg px-2 py-1 text-xs text-left text-emerald-300 hover:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40 inline-flex items-center gap-1.5"
          title={selected ? songLabel(selected) : placeholder}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className={`truncate flex-1 ${selected ? '' : 'text-stone-500'}`}>
            {selected ? songLabel(selected) : 'Sem hino vinculado'}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-stone-500" />
        </button>
        {selected && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange('');
              setOpen(false);
            }}
            className="px-1.5 rounded-lg border border-stone-700 text-stone-400 hover:text-rose-400 hover:border-rose-800/60"
            title="Remover vínculo"
            aria-label="Remover vínculo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
            }}
            className="z-[80] bg-stone-950 border border-stone-700 rounded-xl shadow-xl overflow-hidden flex flex-col"
            role="listbox"
          >
            <div className="p-2 border-b border-stone-800 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2 top-2" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg pl-7 pr-2 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-emerald-600/50"
                />
              </div>
            </div>
            <ul className="overflow-y-auto py-1 min-h-0 flex-1">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-stone-800 ${
                    !value ? 'text-emerald-300' : 'text-stone-400'
                  }`}
                >
                  Sem hino vinculado
                </button>
              </li>
              {filtered.length === 0 ? (
                <li className="px-3 py-3 text-[11px] text-stone-500 text-center">
                  Nenhuma música encontrada
                </li>
              ) : (
                filtered.map((song) => {
                  const active = song.id === value;
                  return (
                    <li key={song.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(song.id);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-stone-800 truncate ${
                          active
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'text-stone-200'
                        }`}
                        title={songLabel(song)}
                      >
                        {song.number != null && (
                          <span className="font-mono text-emerald-400/90 mr-1.5">
                            #{song.number}
                          </span>
                        )}
                        {song.title}
                        {song.author ? (
                          <span className="text-stone-500"> · {song.author}</span>
                        ) : null}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
};
