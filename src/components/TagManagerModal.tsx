import React, { useMemo, useState } from 'react';
import { Song } from '../types';
import { Check, Pencil, Tags, Trash2, X } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmProvider';
import { ActionButton, Badge, EmptyState, Input, Modal } from './ui';

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
  const confirm = useConfirm();
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

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

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? tagStats.filter((t) => t.name.toLowerCase().includes(q)) : tagStats;
  }, [tagStats, filter]);

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

  const removeTag = async (tag: string, count: number) => {
    const ok = await confirm({
      title: 'Remover tag',
      message: `A tag "${tag}" será removida de ${count} ${count === 1 ? 'música' : 'músicas'}.`,
      confirmLabel: 'Remover tag',
    });
    if (!ok) return;
    setBusy(true);
    try {
      await onDeleteTag(tag);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      locked={busy}
      icon={Tags}
      title="Tags das músicas"
      subtitle="Renomear ou remover uma tag atualiza todas as músicas vinculadas."
      size="md"
      footer={
        <ActionButton variant="primary" icon={Check} onClick={onClose} disabled={busy}>
          Concluir
        </ActionButton>
      }
    >
      <div className="space-y-3">
        {tagStats.length > 6 && (
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar tags…"
            aria-label="Filtrar tags"
            className="!min-h-10"
          />
        )}

        {tagStats.length === 0 ? (
          <EmptyState
            compact
            icon={Tags}
            title="Nenhuma tag cadastrada"
            description="Adicione tags ao editar uma música para vê-las aqui."
            className="!shadow-none !border-dashed"
          />
        ) : visible.length === 0 ? (
          <p className="text-xs text-fg-subtle text-center py-6">Nenhuma tag corresponde ao filtro.</p>
        ) : (
          <ul className="space-y-1.5">
            {visible.map(({ name, count }) => (
              <li
                key={name}
                className="px-3 py-2.5 rounded-xl border border-line bg-surface flex items-center justify-between gap-2 text-xs"
              >
                {editingTag === name ? (
                  <form
                    className="flex-1 flex items-center gap-1.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveEdit();
                    }}
                  >
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      disabled={busy}
                      className="!min-h-9 !text-xs"
                      aria-label="Novo nome da tag"
                    />
                    <ActionButton
                      type="submit"
                      icon={Check}
                      variant="primary"
                      loading={busy}
                      aria-label="Salvar"
                      title="Salvar"
                    />
                    <ActionButton
                      icon={X}
                      variant="light"
                      disabled={busy}
                      onClick={() => setEditingTag(null)}
                      aria-label="Cancelar"
                      title="Cancelar"
                    />
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex items-center gap-2">
                      <p className="font-bold text-fg truncate">{name}</p>
                      <Badge tone="neutral" className="font-mono">
                        {count}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <ActionButton
                        icon={Pencil}
                        variant="light"
                        disabled={busy}
                        onClick={() => startEdit(name)}
                        aria-label={`Renomear tag ${name}`}
                        title={`Renomear tag ${name}`}
                      />
                      <ActionButton
                        icon={Trash2}
                        variant="danger"
                        disabled={busy}
                        onClick={() => void removeTag(name, count)}
                        aria-label={`Excluir tag ${name}`}
                        title={`Excluir tag ${name}`}
                      />
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
