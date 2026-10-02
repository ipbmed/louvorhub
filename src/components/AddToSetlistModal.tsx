import React, { useMemo, useState } from 'react';
import { Check, ListMusic, ListPlus } from 'lucide-react';
import type { Setlist, Song } from '@/types';
import { isGroupSetlist } from '@/services/playlists';
import { Alert, Badge, Button, EmptyState, Modal, cn } from './ui';

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
    if ((target.items ?? []).some((i) => i.songId === song.id)) {
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
    <Modal
      open
      onClose={onClose}
      locked={saving}
      icon={ListMusic}
      title="Adicionar à playlist"
      subtitle={songLabel}
      size="sm"
      zIndexClassName="z-[60]"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            icon={ListPlus}
            disabled={!selectedId || options.length === 0}
            loading={saving}
            onClick={() => void handleConfirm()}
          >
            Adicionar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {options.length === 0 ? (
          <EmptyState
            compact
            icon={ListMusic}
            title="Nenhuma playlist disponível"
            description="Crie uma playlist na aba Playlists ou peça acesso de edição a quem a criou."
            className="!shadow-none"
          />
        ) : (
          <div role="radiogroup" aria-label="Playlists" className="space-y-1.5">
            {options.map((s) => {
              const selected = selectedId === s.id;
              const alreadyHas = (s.items ?? []).some((i) => i.songId === song.id);
              const count = (s.items ?? []).length;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    setSelectedId(s.id);
                    setError(null);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-colors flex items-center gap-3 touch-manipulation',
                    selected
                      ? 'bg-brand-soft border-brand-line text-fg'
                      : 'bg-surface-2/60 border-line text-fg-muted hover:border-line-strong hover:text-fg',
                  )}
                >
                  <span
                    className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      selected ? 'bg-brand border-brand text-brand-fg' : 'border-line-strong',
                    )}
                  >
                    {selected && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold truncate">{s.title}</span>
                    <span className="block text-[10px] text-fg-subtle font-mono mt-0.5">
                      {count} {count === 1 ? 'música' : 'músicas'}
                    </span>
                  </span>
                  {alreadyHas && <Badge tone="warning">Já contém</Badge>}
                </button>
              );
            })}
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
      </div>
    </Modal>
  );
};
