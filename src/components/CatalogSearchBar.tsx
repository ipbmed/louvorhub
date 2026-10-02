import React from 'react';
import { Hash, Heart, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from './ui/cn';

interface CatalogSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onOpenKeypad: () => void;
  onOpenAdvancedSearch: () => void;
  showFavoritesOnly?: boolean;
  onToggleFavoritesOnly?: () => void;
  className?: string;
}

const roundBtn =
  'inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors touch-manipulation shrink-0';

/** Busca do catálogo no celular (o cabeçalho fica oculto para usuários logados). */
export const CatalogSearchBar: React.FC<CatalogSearchBarProps> = ({
  value,
  onChange,
  onOpenKeypad,
  onOpenAdvancedSearch,
  showFavoritesOnly = false,
  onToggleFavoritesOnly,
  className,
}) => (
  <div className={cn('flex items-center gap-2', className)}>
    <form
      role="search"
      className="relative flex-1 min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <Search
        className="w-4 h-4 text-fg-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nº, título ou trecho da letra"
        aria-label="Buscar música"
        className={cn(
          'ui-input !min-h-10 !rounded-full !pl-10 !text-sm !bg-surface',
          value.trim() ? '!pr-[5.75rem]' : '!pr-14',
          '[&::-webkit-search-cancel-button]:hidden',
        )}
      />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value.trim() && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Limpar busca"
            aria-label="Limpar busca"
            className="w-7 h-7 inline-flex items-center justify-center rounded-full text-fg-subtle hover:text-fg hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onOpenKeypad}
          title="Teclado numérico do hinário"
          aria-label="Teclado numérico do hinário"
          className="h-7 px-2 inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand-text border border-brand-line text-[11px] font-mono font-bold"
        >
          <Hash className="w-3 h-3" />
          Nº
        </button>
      </div>
    </form>

    {onToggleFavoritesOnly && (
      <button
        type="button"
        onClick={onToggleFavoritesOnly}
        aria-pressed={showFavoritesOnly}
        title={showFavoritesOnly ? 'Mostrar todas as músicas' : 'Mostrar só favoritos'}
        aria-label={showFavoritesOnly ? 'Mostrar todas as músicas' : 'Mostrar só favoritos'}
        className={cn(
          roundBtn,
          showFavoritesOnly
            ? 'bg-danger-soft text-danger-text border-danger-line'
            : 'bg-surface text-fg-muted border-line',
        )}
      >
        <Heart className={cn('w-4 h-4', showFavoritesOnly && 'fill-current')} />
      </button>
    )}

    <button
      type="button"
      onClick={onOpenAdvancedSearch}
      title="Filtros e busca avançada"
      aria-label="Filtros e busca avançada"
      className={cn(roundBtn, 'bg-surface text-fg-muted border-line')}
    >
      <SlidersHorizontal className="w-4 h-4" />
    </button>
  </div>
);
