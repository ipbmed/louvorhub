import React, { useMemo, useState } from 'react';
import { Song } from '../types';
import { X, Trash2, Tags, Check, Pencil } from 'lucide-react';

interface TagManagerModalProps {
  songs: Song[];
  onRenameTag: (from: string, to: string) => void | Promise<void>;
  onDeleteTag: (tag: string) => void | Promise<void>;
  onClose: () => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  songs,
  onRenameTag,
  onDeleteTag,
  onClose,
}) => {
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);

  const tagStats = useMemo(() => {
    const counts = new Map<string, number>();
    songs.forEach((song) => {
      (song.tags || []).forEach((tag) => {
        const key = tag.trim();
        if (!key) return;
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [songs]);

  const startEdit = (tag: string) => {
    setEditingTag(tag);
    setEditValue(tag);
  };

  const saveEdit = async () => {
    if (!editingTag) return;
    const next = editValue.trim();
    if (!next || next === editingTag) {
      setEditingTag(null);
      return;
    }
    setBusy(true);
    try {
      await onRenameTag(editingTag, next);
      setEditingTag(null);
    } finally {
      setBusy(false);
    }
  };

  const removeTag = async (tag: string) => {
    if (!confirm(`Remover a tag "${tag}" de todas as músicas?`)) return;
    setBusy(true);
    try {
      await onDeleteTag(tag);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-stone-100 relative">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-5">
          <div className="flex items-center gap-2">
            <Tags className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-display font-bold text-emerald-100 tracking-tight">
              Gerenciar Tags
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-400 mb-4">
          Tags usadas nas músicas. Renomear ou remover atualiza todas as músicas vinculadas.
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {tagStats.length === 0 ? (
            <div className="py-10 text-center text-xs text-stone-500 border border-dashed border-stone-800 rounded-2xl">
              Nenhuma tag cadastrada nas músicas.
            </div>
          ) : (
            tagStats.map(({ name, count }) => (
              <div
                key={name}
                className="p-3 bg-stone-950 border border-stone-800/80 rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                {editingTag === name ? (
                  <form
                    className="flex-1 flex items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveEdit();
                    }}
                  >
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      disabled={busy}
                      className="flex-1 bg-stone-900 border border-stone-700 rounded-button px-2.5 py-1.5 text-xs text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="p-1.5 text-emerald-300 hover:bg-emerald-950/60 rounded-button"
                      title="Salvar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="min-w-0">
                    <p className="font-bold text-stone-100 truncate">{name}</p>
                    <p className="text-[11px] text-stone-500 font-mono">
                      {count} {count === 1 ? 'música' : 'músicas'}
                    </p>
                  </div>
                )}

                {editingTag !== name && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(name)}
                      disabled={busy}
                      className="p-1.5 text-stone-400 hover:text-emerald-300 hover:bg-stone-800 rounded-button"
                      title="Renomear tag"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeTag(name)}
                      disabled={busy}
                      className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-button"
                      title="Excluir tag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
