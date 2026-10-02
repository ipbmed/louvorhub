import React, { useState } from 'react';
import { Category } from '../types';
import { Search, Filter, RotateCcw, Check } from 'lucide-react';
import { Button, Field, Input, Modal, Select } from './ui';

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

  const activeCount = getAppliedAdvancedFilterChips(localFilters).length;

  const segment = (value: SearchFilters['songType'], label: string) => {
    const selected = localFilters.songType === value;
    return (
      <button
        key={value}
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={() => handleChange('songType', value)}
        className={`flex-1 min-h-9 px-2 rounded-lg text-xs font-semibold transition-colors touch-manipulation ${
          selected ? 'bg-brand text-brand-fg shadow-sm' : 'text-fg-muted hover:text-fg hover:bg-muted'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon={Filter}
      title="Busca avançada"
      subtitle="Combine filtros para encontrar a música certa."
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            icon={RotateCcw}
            onClick={() => {
              onResetFilters();
              onClose();
            }}
            className="mr-auto"
          >
            Limpar
          </Button>
          <Button type="submit" form="advanced-search-form" icon={Check}>
            {activeCount > 0 ? `Aplicar (${activeCount})` : 'Aplicar filtros'}
          </Button>
        </>
      }
    >
      <form id="advanced-search-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <span className="ui-label">Tipo de música</span>
          <div
            role="radiogroup"
            aria-label="Tipo de música"
            className="flex gap-1 p-1 rounded-xl border border-line bg-surface-2"
          >
            {segment('all', 'Todas')}
            {segment('hino', 'Hinos')}
            {segment('cantico', 'Cânticos')}
          </div>
        </div>

        <Field label="Palavra-chave" hint="Busca no título, na letra e nas tags.">
          {(id) => (
            <div className="relative">
              <Search className="w-4 h-4 text-fg-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id={id}
                type="text"
                value={localFilters.keyword}
                onChange={(e) => handleChange('keyword', e.target.value)}
                placeholder="Ex.: Alvo mais que a neve, Aclame, cruz…"
                className="!pl-10"
                autoFocus
              />
            </div>
          )}
        </Field>

        {showNumberRange && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hinário" className="col-span-2">
              {(id) => (
                <Select
                  id={id}
                  value={localFilters.hymnal}
                  onChange={(e) => handleChange('hymnal', e.target.value)}
                  disabled={isCanticoOnly}
                >
                  <option value="">Todos os hinários</option>
                  <option value="Novo Cântico">Novo Cântico</option>
                  <option value="Cantor Cristão">Cantor Cristão</option>
                  <option value="Harpa Cristã">Harpa Cristã</option>
                  <option value="Hinário Evangélico">Hinário Evangélico</option>
                </Select>
              )}
            </Field>
            <Field label="Número mínimo">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={localFilters.minNumber}
                  onChange={(e) => handleChange('minNumber', e.target.value)}
                  placeholder="1"
                  className="font-mono"
                />
              )}
            </Field>
            <Field label="Número máximo">
              {(id) => (
                <Input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={localFilters.maxNumber}
                  onChange={(e) => handleChange('maxNumber', e.target.value)}
                  placeholder="100"
                  className="font-mono"
                />
              )}
            </Field>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria" className="col-span-2 sm:col-span-1">
            {(id) => (
              <Select
                id={id}
                value={localFilters.category}
                onChange={(e) => handleChange('category', e.target.value)}
              >
                <option value="">Todas as categorias</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Tom original" className="col-span-2 sm:col-span-1">
            {(id) => (
              <Select
                id={id}
                value={localFilters.key}
                onChange={(e) => handleChange('key', e.target.value)}
                className="font-mono"
              >
                <option value="">Qualquer tom</option>
                {MUSICAL_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Autor / compositor" className="col-span-2">
            {(id) => (
              <Input
                id={id}
                type="text"
                value={localFilters.author}
                onChange={(e) => handleChange('author', e.target.value)}
                placeholder="Ex.: Lutero, Newton…"
              />
            )}
          </Field>
        </div>

        <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-line bg-surface-2/60 px-3.5 py-3 text-sm text-fg hover:border-line-strong transition-colors">
          <input
            type="checkbox"
            checked={localFilters.hasChordsOnly}
            onChange={(e) => handleChange('hasChordsOnly', e.target.checked)}
            className="w-4.5 h-4.5 rounded accent-emerald-500"
          />
          <span className="min-w-0">
            <span className="block font-semibold">Somente músicas com cifra</span>
            <span className="block text-[11px] text-fg-muted">Oculta letras sem acordes marcados.</span>
          </span>
        </label>
      </form>
    </Modal>
  );
};
