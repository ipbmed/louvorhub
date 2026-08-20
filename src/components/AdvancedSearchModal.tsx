import React, { useState } from 'react';
import { Category } from '../types';
import { X, Search, Filter, RotateCcw, Check } from 'lucide-react';

export interface SearchFilters {
  keyword: string;
  songType: 'all' | 'hino' | 'cantico';
  hymnal: string;
  minNumber: string;
  maxNumber: string;
  category: string;
  key: string;
  author: string;
  hasChordsOnly: boolean;
}

interface AdvancedSearchModalProps {
  categories: Category[];
  filters: SearchFilters;
  onApplyFilters: (newFilters: SearchFilters) => void;
  onResetFilters: () => void;
  onClose: () => void;
}

const MUSICAL_KEYS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B', 'Am', 'Dm', 'Em'];

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  categories,
  filters,
  onApplyFilters,
  onResetFilters,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleChange = (field: keyof SearchFilters, val: any) => {
    setLocalFilters(prev => ({ ...prev, [field]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl flex flex-col text-stone-100 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
              <Filter className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-display font-bold text-emerald-100 tracking-tight">
              Busca Avançada de Louvores
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          
          {/* Filter Song Type: Hinos vs Cânticos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Tipo de Conteúdo
              </label>
              <select
                value={localFilters.songType}
                onChange={(e) => handleChange('songType', e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="all">Todos (Hinos e Cânticos)</option>
                <option value="hino">Apenas Hinos (com Número)</option>
                <option value="cantico">Apenas Cânticos</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Hinário Específico
              </label>
              <select
                value={localFilters.hymnal}
                onChange={(e) => handleChange('hymnal', e.target.value)}
                disabled={localFilters.songType === 'cantico'}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Todos os Hinários</option>
                <option value="Novo Cântico">Novo Cântico</option>
                <option value="Cantor Cristão">Cantor Cristão</option>
                <option value="Harpa Cristã">Harpa Cristã</option>
                <option value="Hinário Evangélico">Hinário Evangélico</option>
              </select>
            </div>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-stone-400 font-semibold mb-1">
              Palavra-chave (Título ou Letra)
            </label>
            <div className="relative">
              <input
                type="text"
                value={localFilters.keyword}
                onChange={(e) => handleChange('keyword', e.target.value)}
                placeholder="Ex: Alvo mais que a neve, Aclame, Cruz..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2.5 pl-9 pr-4 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            </div>
          </div>

          {/* Number Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Número Mínimo
              </label>
              <input
                type="number"
                value={localFilters.minNumber}
                onChange={(e) => handleChange('minNumber', e.target.value)}
                placeholder="Ex: 1"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 font-mono text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Número Máximo
              </label>
              <input
                type="number"
                value={localFilters.maxNumber}
                onChange={(e) => handleChange('maxNumber', e.target.value)}
                placeholder="Ex: 100"
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 font-mono text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-stone-400 font-semibold mb-1">
              Categoria / Temática
            </label>
            <select
              value={localFilters.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Key / Tom dropdown */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Tom Original
              </label>
              <select
                value={localFilters.key}
                onChange={(e) => handleChange('key', e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Qualquer Tom</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Autor / Compositor
              </label>
              <input
                type="text"
                value={localFilters.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="Ex: Lutero, Newton..."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Chords Toggle filter */}
          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-stone-300 font-medium">
              <input
                type="checkbox"
                checked={localFilters.hasChordsOnly}
                onChange={(e) => handleChange('hasChordsOnly', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 bg-stone-950 border-stone-800"
              />
              <span>Exibir apenas hinos com cifras musicais</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                onClose();
              }}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Limpar Filtros</span>
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Filtros</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
