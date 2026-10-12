import React, { useState } from 'react';
import { Category } from '../types';
import { Check, Plus, Tag, Trash2 } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmProvider';
import { ActionButton, EmptyState, Input, Modal } from './ui';

interface CategoryManagerModalProps {
  categories: Category[];
  onSaveCategories: (categories: Category[]) => void;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  onSaveCategories,
  onClose,
}) => {
  const confirm = useConfirm();
  const [catList, setCatList] = useState<Category[]>(categories);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    if (catList.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return;
    }

    const newCatObj: Category = {
      id: `cat-${Date.now()}`,
      name,
      description: newCatDesc.trim() || undefined,
      color: 'amber',
    };

    const updated = [...catList, newCatObj];
    setCatList(updated);
    onSaveCategories(updated);

    setNewCatName('');
    setNewCatDesc('');
  };

  const handleDeleteCategory = async (cat: Category) => {
    const ok = await confirm({
      title: 'Excluir categoria',
      message: `As músicas em "${cat.name}" ficarão sem categoria. Deseja continuar?`,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    const updated = catList.filter((c) => c.id !== cat.id);
    setCatList(updated);
    onSaveCategories(updated);
  };

  const duplicate =
    newCatName.trim() !== '' &&
    catList.some((c) => c.name.toLowerCase() === newCatName.trim().toLowerCase());

  return (
    <Modal
      open
      onClose={onClose}
      icon={Tag}
      title="Categorias de músicas"
      subtitle="Agrupe hinos e cânticos para facilitar a busca no catálogo."
      size="md"
      footer={
        <ActionButton variant="primary" icon={Check} onClick={onClose}>
          Concluir
        </ActionButton>
      }
    >
      <div className="space-y-5">
        <form
          onSubmit={handleAddCategory}
          className="rounded-2xl border border-line bg-surface-2/60 p-3.5 space-y-2.5"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-text">
            Nova categoria
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nome (ex.: Infantil)"
              invalid={duplicate}
              aria-label="Nome da categoria"
            />
            <Input
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Descrição curta (opcional)"
              aria-label="Descrição da categoria"
            />
          </div>
          {duplicate && (
            <p className="text-[11px] text-danger-text font-medium">Já existe uma categoria com este nome.</p>
          )}
          <ActionButton
            type="submit"
            variant="primary"
            icon={Plus}
            className="w-full"
            disabled={!newCatName.trim() || duplicate}
          >
            Adicionar categoria
          </ActionButton>
        </form>

        {catList.length === 0 ? (
          <EmptyState
            compact
            icon={Tag}
            title="Nenhuma categoria"
            description="Adicione a primeira categoria acima."
            className="!shadow-none !border-dashed"
          />
        ) : (
          <ul className="space-y-1.5">
            {catList.map((cat) => (
              <li
                key={cat.id}
                className="px-3 py-2.5 rounded-xl border border-line bg-surface flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-fg truncate">{cat.name}</p>
                  {cat.description && (
                    <p className="text-[11px] text-fg-muted truncate">{cat.description}</p>
                  )}
                </div>
                <ActionButton
                  icon={Trash2}
                  variant="danger"
                  onClick={() => void handleDeleteCategory(cat)}
                  aria-label={`Excluir categoria ${cat.name}`}
                  title={`Excluir categoria ${cat.name}`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};
