import React, { useMemo, useState } from 'react';
import { Check, ListMusic, ListPlus } from 'lucide-react';
import type { Setlist, Song } from '@/types';
import { isGroupSetlist } from '@/services/playlists';
import { ActionButton, Alert, Badge, EmptyState, Modal, cn } from './ui';

interface AddToSetlistModalProps {
  songs: Song[];
  setlists: Setlist[];
  onClose: () => void;
  onConfirm: (setlist: Setlist) => void | Promise<void>;
}

export const AddToSetlistModal: React.FC<AddToSetlistModalProps> = ({
  songs,
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

  const single = songs.length === 1 ? songs[0] : null;
  const subtitle = single
    ? single.number
      ? `#${single.number} · ${single.title}`
      : single.title
    : `${songs.length} músicas`;

  const countAlreadyIn = (s: Setlist) => {
    const ids = new Set((s.items ?? []).map((i) => i.songId));
    return songs.filter((song) => ids.has(song.id)).length;
  };

  const handleConfirm = async () => {
    const target = options.find((s) => s.id === selectedId);
    if (!target) {
      setError('Selecione uma playlist.');
      return;
    }
    if (countAlreadyIn(target) === songs.length) {
      setError(single ? 'Esta música já está nesta playlist.' : 'Todas essas músicas já estão nesta playlist.');
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
      subtitle={subtitle}
      size="sm"
      zIndexClassName="z-[120]"
      footer={
        <>
          <ActionButton variant="light" onClick={onClose} disabled={saving}>
            Cancelar
          </ActionButton>
          <ActionButton
            variant="primary"
            icon={ListPlus}
            disabled={!selectedId || options.length === 0}
            loading={saving}
            onClick={() => void handleConfirm()}
          >
            Adicionar
          </ActionButton>
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
              const alreadyIn = countAlreadyIn(s);
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
                  {alreadyIn > 0 && (
                    <Badge tone="warning">
                      {single || alreadyIn === songs.length ? 'Já contém' : `Já contém ${alreadyIn}`}
                    </Badge>
                  )}
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
