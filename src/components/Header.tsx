import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Search,
  SlidersHorizontal,
  Lock,
  LockOpen,
  Grid,
  Heart,
  Menu,
  X,
  HelpCircle,
} from 'lucide-react';
import { ViewMode } from '../types';
import { PublicEventsFab } from './PublicEventsFab';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  onViewChange: (view: ViewMode) => void;
  quickNumberQuery: string;
  onQuickNumberChange: (val: string) => void;
  onOpenKeypad: () => void;
  onOpenAdvancedSearch: () => void;
  isAuthenticated: boolean;
  onAdminAuthClick: () => void;
  onSignOut?: () => void;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  /** Mobile: abre o drawer do menu */
  onOpenSidebar?: () => void;
  /** Mostra notificação de eventos públicos (visitantes). */
  showPublicEvents?: boolean;
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onViewChange,
  quickNumberQuery,
  onQuickNumberChange,
  onOpenKeypad,
  onOpenAdvancedSearch,
  isAuthenticated,
  onAdminAuthClick,
  onSignOut,
  favoritesCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  onOpenSidebar,
  showPublicEvents = false,
  onOpenHelp,
}) => {
  const [inputVal, setInputVal] = useState(quickNumberQuery);

  useEffect(() => {
    setInputVal(quickNumberQuery);
  }, [quickNumberQuery]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onQuickNumberChange(inputVal.trim());
    }
  };

  const clearSearch = () => {
    setInputVal('');
    onQuickNumberChange('');
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-stone-900/95 backdrop-blur-md text-stone-100 border-b border-emerald-900/40 shadow-lg">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        {/* Barra principal: logo esquerda · busca centro · ações direita */}
        <div className="flex items-center gap-3 h-16 sm:h-20 w-full">
          {/* Esquerda */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {isAuthenticated && onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className="lg:hidden p-2 rounded-button bg-stone-800/80 text-stone-300 border border-stone-700 hover:bg-stone-700"
                title="Abrir menu"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0"
              onClick={() => onViewChange('public')}
            >
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-stone-950 font-black shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30 shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-display font-bold tracking-tight bg-gradient-to-r from-emerald-200 via-emerald-100 to-emerald-400 light:from-emerald-700 light:via-emerald-600 light:to-emerald-800 bg-clip-text text-transparent truncate">
                  LouvorHub
                </h1>
                <p className="hidden sm:block text-[10px] sm:text-xs text-emerald-200/70 light:text-emerald-700/80 font-medium tracking-wider uppercase truncate">
                  IPB MEDIANEIRA
                </p>
              </div>
            </div>
          </div>

          {/* Centro — busca */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center min-w-0 px-4">
            <form onSubmit={handleQuickSubmit} className="relative w-full max-w-xl">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  onQuickNumberChange(e.target.value);
                }}
                placeholder="Buscar hino por nº, título, letra..."
                className={`w-full bg-stone-800/90 border border-stone-700/80 rounded-xl py-2 pl-10 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${
                  inputVal.trim() ? 'pr-32' : 'pr-24'
                }`}
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
              {inputVal.trim() && (
                <button
                  type="button"
                  onClick={clearSearch}
                  title="Limpar busca"
                  aria-label="Limpar busca"
                  className="absolute right-14 top-1.5 p-1.5 rounded-button text-stone-400 hover:text-stone-100 hover:bg-stone-700/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenKeypad}
                title="Teclado numérico rápido"
                className="absolute right-1.5 top-1.5 px-2 py-1 bg-stone-700/80 hover:bg-stone-700 text-emerald-300 rounded-button text-xs font-mono font-semibold flex items-center gap-1 border border-stone-600 transition-colors light:bg-emerald-100 light:hover:bg-emerald-200 light:text-emerald-900 light:border-emerald-300"
              >
                <Grid className="w-3 h-3" />
                Nº
              </button>
            </form>

            <button
              onClick={onOpenAdvancedSearch}
              title="Filtros e Busca Avançada"
              className="p-2.5 bg-stone-800 hover:bg-stone-700/80 text-stone-300 hover:text-emerald-300 rounded-button border border-stone-700 transition-colors flex items-center justify-center shrink-0"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Direita — ações */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 ml-auto">
            <ThemeToggle />
            {onOpenHelp && (
              <button
                type="button"
                onClick={onOpenHelp}
                className="p-2 rounded-button bg-stone-800/80 text-stone-300 border border-stone-700 hover:bg-stone-700/80 hover:text-emerald-300 transition-colors"
                title="Ajuda"
                aria-label="Abrir ajuda"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
            <PublicEventsFab enabled={showPublicEvents} />

            {isAuthenticated && (
              <button
                onClick={onToggleFavoritesOnly}
                className={`p-2 sm:px-3 sm:py-2 rounded-button text-xs font-medium flex items-center gap-1.5 transition-all border ${
                  showFavoritesOnly
                    ? 'bg-rose-950/60 text-rose-300 border-rose-700/60 shadow-sm shadow-rose-900/30'
                    : 'bg-stone-800/80 text-stone-300 border-stone-700 hover:bg-stone-700/80'
                }`}
                title="Favoritos"
              >
                <Heart
                  className={`w-4 h-4 ${showFavoritesOnly ? 'fill-rose-400 text-rose-400' : 'text-stone-400'}`}
                />
                <span className="hidden lg:inline">Favoritos</span>
                {favoritesCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded-full text-[10px] font-bold">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={isAuthenticated && onSignOut ? onSignOut : onAdminAuthClick}
              className={`p-2 sm:px-3 sm:py-2 rounded-button text-xs font-medium flex items-center gap-1.5 transition-all border ${
                isAuthenticated
                  ? 'hidden sm:flex bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-sm'
                  : 'bg-stone-800/80 text-stone-400 border-stone-700 hover:bg-stone-700/80 hover:text-stone-200'
              }`}
              title={isAuthenticated ? 'Sair' : 'Entrar com e-mail'}
            >
              {isAuthenticated ? (
                <>
                  <LockOpen className="w-4 h-4 text-emerald-400" />
                  <span className="hidden sm:inline font-semibold">Sair</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Quick Search Bar */}
        <div className="md:hidden pb-3 pt-1 flex items-center gap-2 border-t border-stone-800/80 mt-1">
          <form onSubmit={handleQuickSubmit} className="relative flex-1">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                onQuickNumberChange(e.target.value);
              }}
              placeholder="Nº, título ou palavra..."
              className={`w-full bg-stone-800 border border-stone-700 rounded-xl py-2 pl-9 text-xs text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                inputVal.trim() ? 'pr-24' : 'pr-16'
              }`}
            />
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
            {inputVal.trim() && (
              <button
                type="button"
                onClick={clearSearch}
                title="Limpar busca"
                aria-label="Limpar busca"
                className="absolute right-12 top-1.5 p-1.5 rounded-button text-stone-400 hover:text-stone-100 hover:bg-stone-700/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onOpenKeypad}
              className="absolute right-1 top-1 px-2 py-1 bg-stone-700 text-emerald-300 rounded-button text-[10px] font-mono font-bold flex items-center gap-1 border border-stone-600 light:bg-emerald-100 light:hover:bg-emerald-200 light:text-emerald-900 light:border-emerald-300 transition-colors"
            >
              <Grid className="w-3 h-3" />
              Nº
            </button>
          </form>

          <button
            onClick={onOpenAdvancedSearch}
            className="p-2 bg-stone-800 text-stone-300 rounded-button border border-stone-700 shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
