import React from 'react';
import { Filter, Pencil, RotateCcw, X } from 'lucide-react';
import {
  getAppliedAdvancedFilterChips,
  hasActiveAdvancedFilters,
  type SearchFilters,
} from './AdvancedSearchModal';

interface AppliedAdvancedFiltersBarProps {
  filters: SearchFilters;
  resultCount?: number;
  onUpdateFilters: (filters: SearchFilters) => void;
  onClearAll: () => void;
  onEdit: () => void;
}

export const AppliedAdvancedFiltersBar: React.FC<AppliedAdvancedFiltersBarProps> = ({
  filters,
  resultCount,
  onUpdateFilters,
  onClearAll,
  onEdit,
}) => {
  if (!hasActiveAdvancedFilters(filters)) return null;

  const chips = getAppliedAdvancedFilterChips(filters);

  const removeChip = (patch: Partial<SearchFilters>) => {
    onUpdateFilters({ ...filters, ...patch });
  };

  return (
    <div className="flex flex-col gap-2 pt-3 mt-1 border-t border-stone-800/80 light:border-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Filter className="w-3.5 h-3.5 shrink-0 text-emerald-400 light:text-emerald-600" aria-hidden />
          <span className="text-[11px] font-semibold text-stone-400 light:text-stone-600 uppercase tracking-wide">
            Busca avançada
          </span>
          {resultCount != null && (
            <span className="text-[11px] text-stone-500 light:text-stone-500">
              · {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-stone-400 light:text-stone-600 hover:text-emerald-300 light:hover:text-emerald-700 rounded-button transition-colors"
          >
            <Pencil className="w-3 h-3" aria-hidden />
            Editar
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-stone-400 light:text-stone-600 hover:text-rose-300 light:hover:text-rose-600 rounded-button transition-colors"
          >
            <RotateCcw className="w-3 h-3" aria-hidden />
            Limpar
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full border text-[10px] font-medium bg-emerald-500/10 light:bg-emerald-50 border-emerald-500/30 light:border-emerald-200 text-emerald-300 light:text-emerald-800"
          >
            {chip.label}
            <button
              type="button"
              onClick={() => removeChip(chip.patch)}
              className="p-0.5 rounded-full hover:bg-emerald-500/20 light:hover:bg-emerald-100 text-emerald-300/80 light:text-emerald-700 hover:text-emerald-100 light:hover:text-emerald-900 transition-colors"
              aria-label={`Remover filtro ${chip.label}`}
            >
              <X className="w-3 h-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};
