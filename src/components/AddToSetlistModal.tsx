import React, { useMemo, useState } from 'react';
import { Calendar, ListMusic, Loader2, X } from 'lucide-react';
import type { Setlist, Song } from '@/types';
import { isGroupSetlist } from '@/services/playlists';

interface AddToSetlistModalProps {
  song: Song;
  setlists: Setlist[];
  onClose: () => void;
  onConfirm: (setlist: Setlist) => void | Promise<void>;
}

export const AddToSetlistModal: React.FC<AddToSetlistModalProps> = ({
  song,
  setlists,
  onClose,
  onConfirm,
}) => {
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = useMemo(
    () => setlists.filter((s) => s.canEdit !== false && !s.archived && !isGroupSetlist(s)),
    [setlists],
  );

  const songLabel = song.number ? `#${song.number} · ${song.title}` : song.title;

  const handleConfirm = async () => {
    const target = options.find((s) => s.id === selectedId);
    if (!target) {
      setError('Selecione uma playlist.');
      return;
    }
    if (target.items.some((i) => i.songId === song.id)) {
      setError('Esta música já está nesta playlist.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await Promise.resolve(onConfirm(target));
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Não foi possível adicionar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl text-stone-100 overflow-hidden">
        <div className="p-5 border-b border-stone-800 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-display font-bold text-emerald-100 flex items-center gap-2">
              <ListMusic className="w-5 h-5 text-emerald-400" />
              Adicionar à playlist
            </h3>
            <p className="text-xs text-stone-400 mt-1 line-clamp-2">{songLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {options.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">
              Nenhuma playlist disponível. Crie uma em Playlists ou peça acesso de edição.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {options.map((s) => (
                <SetlistOption
                  key={s.id}
                  setlist={s}
                  selected={selectedId === s.id}
                  alreadyHas={s.items.some((i) => i.songId === song.id)}
                  onSelect={() => {
                    setSelectedId(s.id);
                    setError(null);
                  }}
                />
              ))}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="p-5 border-t border-stone-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedId || saving || options.all.length === 0}
            onClick={() => void handleConfirm()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
};

const SetlistOption: React.FC<{
  setlist: Setlist;
  selected: boolean;
  alreadyHas: boolean;
  onSelect: () => void;
}> = ({ setlist, selected, alreadyHas, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors ${
      selected
        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-100'
        : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
    }`}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-semibold truncate">{setlist.title}</span>
      <span className="font-mono text-[10px] text-stone-500 shrink-0">
        {setlist.items.length} mús.
      </span>
    </div>
    <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-500">
      <span className="inline-flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        {setlist.date}
      </span>
      {alreadyHas && <span className="text-amber-300/90">Já contém</span>}
    </div>
  </button>
);
