import React, { useEffect, useMemo, useState } from 'react';
import { Check, ListMusic, Loader2, Search, X } from 'lucide-react';
import type { Song } from '../types';

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const existing = useMemo(() => new Set(existingSongIds), [existingSongIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = !q
      ? songs
      : songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            (s.number != null && String(s.number).includes(q)) ||
            (s.author && s.author.toLowerCase().includes(q)),
        );
    return list.slice(0, 120);
  }, [songs, query]);

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
            <h3 className="text-lg font-display font-bold text-emerald-100 flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-emerald-400" />
              Adicionar ao repertório
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Selecione as músicas do catálogo para este evento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-stone-800 shrink-0">
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

        <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-stone-500 text-center py-8">Nenhuma música encontrada.</p>
          ) : (
            filtered.map((song) => {
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
                      ? 'bg-stone-950/40 border-stone-800 text-stone-500 opacity-60 cursor-default'
                      : isSelected
                        ? 'bg-emerald-950/50 border-emerald-700/50 text-emerald-100'
                        : 'bg-stone-950/40 border-stone-800 text-stone-300 hover:border-stone-700'
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
        </div>

        <div className="p-4 border-t border-stone-800 shrink-0 space-y-2">
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-stone-500 font-mono">
              {selected.size} selecionada{selected.size === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || selected.size === 0}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Adicionar{selected.size > 0 ? ` (${selected.size})` : ''}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
