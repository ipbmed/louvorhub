import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ListMusic, Search, X } from 'lucide-react';
import type { Song } from '../types';
import { ActionButton } from './ui';
import { SongTypeFilter, resolveSongType, type SongTypeMode } from './SongTypeFilter';

const PAGE_SIZE = 80;

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

interface AddSongsToEventSetlistModalProps {
  songs: Song[];
  existingSongIds: string[];
  saving?: boolean;
  onClose: () => void;
  onAdd: (songIds: string[]) => void | Promise<void>;
}

export const AddSongsToEventSetlistModal: React.FC<AddSongsToEventSetlistModalProps> = ({
  songs,
  existingSongIds,
  saving = false,
  onClose,
  onAdd,
}) => {
  const [query, setQuery] = useState('');
  const [typeMode, setTypeMode] = useState<SongTypeMode>('todos');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(() => new Set(existingSongIds), [existingSongIds]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return songs.filter((s) => {
      if (typeMode !== 'todos' && resolveSongType(s) !== typeMode) return false;
      if (!q) return true;
      return (
        normalize(s.title).includes(q) ||
        (s.number != null && String(s.number).includes(q)) ||
        (s.author != null && normalize(s.author).includes(q))
      );
    });
  }, [songs, query, typeMode]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    listRef.current?.scrollTo({ top: 0 });
  }, [query, typeMode]);

  const hasMore = visibleCount < filtered.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => n + PAGE_SIZE);
        }
      },
      { root: listRef.current, rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const toggle = (songId: string) => {
    if (existing.has(songId)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  };

  const handleConfirm = async () => {
    const ids = [...selected];
    if (!ids.length) {
      setError('Selecione ao menos uma música.');
      return;
    }
    setError(null);
    try {
      await Promise.resolve(onAdd(ids));
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível adicionar.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg shadow-2xl text-stone-100 overflow-hidden max-h-[min(92vh,640px)] flex flex-col">
        <div className="p-5 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-lg font-display font-bold text-emerald-100 light:text-stone-900 flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-emerald-400 light:text-emerald-600" />
              Adicionar ao repertório
            </h3>
            <p className="text-xs text-stone-400 light:text-stone-500 mt-1">
              Selecione as músicas do catálogo para este evento.
            </p>
          </div>
          <ActionButton
            variant="light"
            icon={X}
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            title="Fechar"
          />
        </div>

        <div className="p-4 border-b border-stone-800 shrink-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <SongTypeFilter
              showHinos={typeMode !== 'cantico'}
              showCanticos={typeMode !== 'hino'}
              onChange={setTypeMode}
              fullWidth
              className="flex-1"
            />
            <span className="text-[11px] text-stone-500 shrink-0 tabular-nums">
              {filtered.length} música{filtered.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por título, número ou artista..."
              className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-8">Nenhuma música encontrada.</p>
          ) : (
            filtered.slice(0, visibleCount).map((song) => {
              const already = existing.has(song.id);
              const isSelected = selected.has(song.id);
              return (
                <button
                  key={song.id}
                  type="button"
                  disabled={already || saving}
                  onClick={() => toggle(song.id)}
                  className={`w-full flex items-center gap-2.5 text-left px-3 py-2.5 rounded-xl border text-xs transition-colors ${
                    already
                      ? 'bg-stone-950/40 light:bg-stone-100 border-stone-800 light:border-stone-200 text-stone-500 opacity-60 cursor-default'
                      : isSelected
                        ? 'bg-emerald-950/50 light:bg-emerald-50 border-emerald-700/50 light:border-emerald-300 text-emerald-100 light:text-emerald-900 font-semibold'
                        : 'bg-stone-950/40 light:bg-stone-50 border-stone-800 light:border-stone-200 text-stone-300 light:text-stone-800 hover:border-stone-700 light:hover:border-stone-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                      already || isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-stone-950'
                        : 'border-stone-600'
                    }`}
                  >
                    {(already || isSelected) && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="font-mono text-emerald-400 shrink-0">
                    {song.number != null ? `#${song.number}` : '♪'}
                  </span>
                  <span className="truncate flex-1 font-medium">{song.title}</span>
                  {already && (
                    <span className="text-[10px] text-stone-500 shrink-0">Já no repertório</span>
                  )}
                </button>
              );
            })
          )}
          {hasMore && <div ref={sentinelRef} className="h-8" aria-hidden />}
        </div>

        <div className="p-4 border-t border-stone-800 shrink-0 space-y-2">
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-stone-500 font-mono">
              {selected.size} selecionada{selected.size === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <ActionButton variant="light" onClick={onClose} disabled={saving}>
                Cancelar
              </ActionButton>
              <ActionButton
                variant="primary"
                icon={Check}
                onClick={() => void handleConfirm()}
                loading={saving}
                disabled={selected.size === 0}
              >
                Adicionar{selected.size > 0 ? ` (${selected.size})` : ''}
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
