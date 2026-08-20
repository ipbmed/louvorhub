import React, { useState } from 'react';
import { Category } from '../types';
import { X, Plus, Trash2, Edit2, Check, Tag } from 'lucide-react';

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
  const [catList, setCatList] = useState<Category[]>(categories);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCatObj: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined,
      color: 'amber'
    };

    const updated = [...catList, newCatObj];
    setCatList(updated);
    onSaveCategories(updated);

    setNewCatName('');
    setNewCatDesc('');
  };

  const handleDeleteCategory = (id: string) => {
    const updated = catList.filter(c => c.id !== id);
    setCatList(updated);
    onSaveCategories(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-stone-100 relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-5">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-400" />
            <h3 className="text-xl font-display font-bold text-emerald-100 tracking-tight">
              Gerenciar Categorias de Hinos
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form to add new category */}
        <form onSubmit={handleAddCategory} className="space-y-3 mb-6 bg-stone-950 p-4 rounded-2xl border border-stone-800">
          <h4 className="text-xs font-mono font-bold uppercase text-emerald-400">
            Nova Categoria
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Nome da categoria (ex: Infantil)"
              className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
            />
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Descrição curta (opcional)"
              className="w-full bg-stone-900 border border-stone-800 rounded-xl p-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Categoria</span>
          </button>
        </form>

        {/* Current Categories List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {catList.map((cat) => (
            <div
              key={cat.id}
              className="p-3 bg-stone-950 border border-stone-800/80 rounded-xl flex items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-bold text-stone-100">{cat.name}</p>
                {cat.description && (
                  <p className="text-[11px] text-stone-400">{cat.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="p-1.5 text-rose-400 hover:bg-rose-950/60 rounded-button"
                title="Excluir Categoria"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
