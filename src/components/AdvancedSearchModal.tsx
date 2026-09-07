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

export interface AppliedFilterChip {
  id: string;
  label: string;
  patch: Partial<SearchFilters>;
}

export function getAppliedAdvancedFilterChips(filters: SearchFilters): AppliedFilterChip[] {
  const chips: AppliedFilterChip[] = [];

  if (filters.keyword.trim()) {
    chips.push({
      id: 'keyword',
      label: `Palavra: “${filters.keyword.trim()}”`,
      patch: { keyword: '' },
    });
  }
  if (filters.songType === 'hino') {
    chips.push({
      id: 'songType',
      label: 'Apenas hinos',
      patch: { songType: 'all' },
    });
  } else if (filters.songType === 'cantico') {
    chips.push({
      id: 'songType',
      label: 'Apenas cânticos',
      patch: { songType: 'all' },
    });
  }
  if (filters.hymnal) {
    chips.push({
      id: 'hymnal',
      label: `Hinário: ${filters.hymnal}`,
      patch: { hymnal: '' },
    });
  }
  if (filters.minNumber) {
    chips.push({
      id: 'minNumber',
      label: `Nº mín: ${filters.minNumber}`,
      patch: { minNumber: '' },
    });
  }
  if (filters.maxNumber) {
    chips.push({
      id: 'maxNumber',
      label: `Nº máx: ${filters.maxNumber}`,
      patch: { maxNumber: '' },
    });
  }
  if (filters.category) {
    chips.push({
      id: 'category',
      label: `Categoria: ${filters.category}`,
      patch: { category: '' },
    });
  }
  if (filters.key) {
    chips.push({
      id: 'key',
      label: `Tom: ${filters.key}`,
      patch: { key: '' },
    });
  }
  if (filters.author.trim()) {
    chips.push({
      id: 'author',
      label: `Autor: ${filters.author.trim()}`,
      patch: { author: '' },
    });
  }
  if (filters.hasChordsOnly) {
    chips.push({
      id: 'hasChordsOnly',
      label: 'Com cifras',
      patch: { hasChordsOnly: false },
    });
  }

  return chips;
}

export function hasActiveAdvancedFilters(filters: SearchFilters): boolean {
  return getAppliedAdvancedFilterChips(filters).length > 0;
}

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  categories,
  filters,
  onApplyFilters,
  onResetFilters,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<SearchFilters>(filters);

  const handleChange = (field: keyof SearchFilters, val: SearchFilters[keyof SearchFilters]) => {
    setLocalFilters((prev) => {
      const next = { ...prev, [field]: val };
      if (field === 'songType' && val === 'cantico') {
        next.hymnal = '';
        next.minNumber = '';
        next.maxNumber = '';
      }
      return next;
    });
  };

  const isCanticoOnly = localFilters.songType === 'cantico';
  const showNumberRange = !isCanticoOnly;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
      
      <div className="bg-stone-900 border border-stone-800 rounded-2xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col text-stone-100 relative max-h-[90vh] overflow-hidden">
        
        {/* Header — fixo, fora da área com scroll */}
        <div className="shrink-0 flex items-center justify-between px-3.5 sm:px-5 pt-3.5 sm:pt-5 pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-800 flex items-center justify-center font-bold">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-lg sm:text-xl font-display font-bold text-emerald-100 light:text-stone-900 tracking-tight truncate">
              Busca avançada
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3.5 sm:px-5 py-3 sm:py-4 space-y-3 text-xs sm:text-sm">
          
          {/* Filter Song Type: Hinos vs Cânticos */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Tipo de Conteúdo
              </label>
              <select
                value={localFilters.songType}
                onChange={(e) => handleChange('songType', e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                disabled={isCanticoOnly}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-stone-100 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl py-2 sm:py-2.5 pl-9 pr-3 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 sm:top-3" />
            </div>
          </div>

          {/* Number Range */}
          {showNumberRange && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-stone-400 font-semibold mb-1">
                  Número Mínimo
                </label>
                <input
                  type="number"
                  value={localFilters.minNumber}
                  onChange={(e) => handleChange('minNumber', e.target.value)}
                  placeholder="Ex: 1"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 font-mono text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 font-mono text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>
            </div>
          )}

          {/* Category Dropdown */}
          <div>
            <label className="block text-stone-400 font-semibold mb-1">
              Categoria / Temática
            </label>
            <select
              value={localFilters.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-stone-400 font-semibold mb-1">
                Tom Original
              </label>
              <select
                value={localFilters.key}
                onChange={(e) => handleChange('key', e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-stone-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-2 sm:p-2.5 text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Chords Toggle filter */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-stone-300 font-medium">
              <input
                type="checkbox"
                checked={localFilters.hasChordsOnly}
                onChange={(e) => handleChange('hasChordsOnly', e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500 bg-stone-950 border-stone-800"
              />
              <span>Exibir apenas músicas com cifras</span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                onResetFilters();
                onClose();
              }}
              className="px-3 sm:px-4 py-2 sm:py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Limpar Filtros</span>
            </button>

            <button
              type="submit"
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-colors"
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
