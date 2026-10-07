import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Music2,
  Search,
  SlidersHorizontal,
  LogIn,
  LogOut,
  Hash,
  Heart,
  Menu,
  X,
  Church,
  Edit3,
  Download,
} from 'lucide-react';
import { ViewMode } from '../types';
import { PublicEventsFab } from './PublicEventsFab';
import { ThemeToggle } from './ThemeToggle';
import { WORKSPACE_VIEWS } from './ChurchWorkspace';
import { usePwa } from '@/contexts/PwaProvider';
import { cn } from './ui/cn';

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
  /** View atual — a busca mobile só aparece no catálogo. */
  currentView?: ViewMode;
  /** Igreja ativa — no mobile o header mostra ícone + sigla dentro do workspace. */
  activeChurchSigla?: string | null;
  activeChurchName?: string | null;
  /** Mobile: editar igreja (lápis no ícone). */
  canEditActiveChurch?: boolean;
  onEditActiveChurch?: () => void;
  /** Oculta o cabeçalho no celular (navegação fica no menu e na barra inferior). */
  hideOnMobile?: boolean;
  /** Oculta o cabeçalho em telas grandes (catálogo dividido usa a barra lateral de ícones). */
  hideOnDesktop?: boolean;
}

const iconBtn =
  'inline-flex items-center justify-center w-10 h-10 rounded-button border border-line bg-muted/70 text-fg-muted hover:text-fg hover:bg-muted-hover transition-colors touch-manipulation shrink-0';

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
  currentView = 'public',
  activeChurchSigla,
  activeChurchName,
  canEditActiveChurch = false,
  onEditActiveChurch,
  hideOnMobile = false,
  hideOnDesktop = false,
}) => {
  const [inputVal, setInputVal] = useState(quickNumberQuery);
  const { canInstall, install } = usePwa();
  const showMobileSearch = currentView === 'public';
  const churchBrandLabel = activeChurchSigla?.trim() || activeChurchName?.trim() || '';
  const inChurchWorkspace = Boolean(
    isAuthenticated && churchBrandLabel && (WORKSPACE_VIEWS as string[]).includes(currentView),
  );
  const canOpenSelectedChurch = Boolean(isAuthenticated && churchBrandLabel);

  useEffect(() => {
    setInputVal(quickNumberQuery);
  }, [quickNumberQuery]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) onQuickNumberChange(inputVal.trim());
  };

  const clearSearch = () => {
    setInputVal('');
    onQuickNumberChange('');
  };

  const renderSearch = (variant: 'desktop' | 'mobile') => {
    const isMobile = variant === 'mobile';
    return (
      <form
        onSubmit={handleQuickSubmit}
        role="search"
        className={cn('relative flex-1 min-w-0', !isMobile && 'max-w-xl')}
      >
        <Search
          className="w-4 h-4 text-fg-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            onQuickNumberChange(e.target.value);
          }}
          placeholder={isMobile ? 'Nº, título ou trecho da letra' : 'Buscar hino por nº, título ou letra…'}
          aria-label="Buscar música"
          className={cn(
            'ui-input !min-h-10 !rounded-full !pl-10 !text-sm !bg-surface-2',
            inputVal.trim() ? '!pr-[5.75rem]' : '!pr-14',
            '[&::-webkit-search-cancel-button]:hidden',
          )}
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputVal.trim() && (
            <button
              type="button"
              onClick={clearSearch}
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
            className="h-7 px-2 inline-flex items-center gap-1 rounded-full bg-brand-soft text-brand-text border border-brand-line text-[11px] font-mono font-bold hover:bg-brand hover:text-brand-fg transition-colors"
          >
            <Hash className="w-3 h-3" />
            Nº
          </button>
        </div>
      </form>
    );
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 w-full bg-app/85 backdrop-blur-md text-fg border-b border-line/60 pt-safe',
        hideOnMobile && 'hidden md:block',
        hideOnDesktop && 'lg:hidden',
      )}
    >
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center gap-2 sm:gap-3 h-14 sm:h-16 w-full">
          {/* Esquerda — menu + marca */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
            {isAuthenticated && onOpenSidebar && (
              <button
                type="button"
                onClick={onOpenSidebar}
                className={cn(iconBtn, 'lg:hidden')}
                title="Abrir menu"
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {inChurchWorkspace && (
              <div className="flex sm:hidden items-center gap-2 min-w-0">
                {canEditActiveChurch && onEditActiveChurch ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditActiveChurch();
                    }}
                    title="Editar igreja"
                    aria-label="Editar igreja"
                    className="relative w-10 h-10 rounded-xl bg-brand-soft text-brand-text border border-brand-line flex items-center justify-center shrink-0 hover:brightness-110 transition"
                  >
                    <Church className="w-5 h-5" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand text-brand-fg flex items-center justify-center ring-2 ring-surface shadow-sm">
                      <Edit3 className="w-2.5 h-2.5" strokeWidth={2.5} />
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onViewChange('workspace')}
                    aria-label="Início da igreja"
                    className="w-10 h-10 rounded-xl bg-brand-soft text-brand-text border border-brand-line flex items-center justify-center shrink-0"
                  >
                    <Church className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onViewChange('workspace')}
                  title="Ir para Início"
                  className="text-base font-display font-bold text-fg tracking-tight truncate uppercase text-left min-w-0 hover:opacity-80 transition-opacity"
                >
                  {churchBrandLabel}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onViewChange('public')}
              title="Ir para o catálogo"
              className={cn(
                'items-center gap-2.5 min-w-0 text-left group',
                inChurchWorkspace ? 'hidden sm:flex' : 'flex',
              )}
            >
              <span className="btn-gradient w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 group-hover:scale-[1.03] transition-transform">
                <Music2 className="w-[18px] h-[18px]" strokeWidth={2.4} />
              </span>
              <div className="min-w-0 leading-none">
                <h1 className="text-[17px] sm:text-lg font-medium tracking-tight text-fg truncate">
                  Louvor<b className="font-extrabold text-brand-text">Hub</b>
                </h1>
                <p className="hidden sm:block mt-0.5 text-[10px] text-fg-subtle font-semibold tracking-[0.14em] uppercase truncate">
                  {activeChurchSigla?.trim() || 'Caderno de louvor'}
                </p>
              </div>
            </button>
          </div>

          {/* Centro — busca (desktop) */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center min-w-0 px-4">
            {renderSearch('desktop')}
            <button
              type="button"
              onClick={onOpenAdvancedSearch}
              title="Filtros e busca avançada"
              aria-label="Filtros e busca avançada"
              className={iconBtn}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Direita — ações */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {inChurchWorkspace ? (
              <button
                type="button"
                onClick={() => onViewChange('public')}
                title="Catálogo"
                aria-label="Abrir catálogo"
                className={cn(iconBtn, 'sm:hidden')}
              >
                <BookOpen className="w-5 h-5" />
              </button>
            ) : canOpenSelectedChurch ? (
              <button
                type="button"
                onClick={() => onViewChange('workspace')}
                title={churchBrandLabel}
                aria-label={`Abrir ${churchBrandLabel}`}
                className={cn(
                  iconBtn,
                  'sm:hidden !bg-brand-soft !text-brand-text !border-brand-line',
                )}
              >
                <Church className="w-5 h-5" />
              </button>
            ) : null}

            {canInstall && (
              <button
                type="button"
                onClick={() => void install()}
                title="Instalar aplicativo"
                aria-label="Instalar aplicativo"
                className={cn(
                  iconBtn,
                  'hidden sm:inline-flex sm:w-auto sm:px-3 gap-1.5 text-xs font-semibold !bg-brand-soft !text-brand-text !border-brand-line hover:!bg-brand hover:!text-brand-fg',
                )}
              >
                <Download className="w-4 h-4" />
                <span className="hidden lg:inline">Instalar</span>
              </button>
            )}

            <ThemeToggle compact />
            <PublicEventsFab enabled={showPublicEvents} />

            {isAuthenticated && (
              <button
                type="button"
                onClick={onToggleFavoritesOnly}
                aria-pressed={showFavoritesOnly}
                className={cn(
                  'hidden sm:inline-flex items-center gap-1.5 min-h-10 px-3 rounded-button text-xs font-semibold border transition-colors',
                  showFavoritesOnly
                    ? 'bg-danger-soft text-danger-text border-danger-line'
                    : 'bg-muted/70 text-fg-muted border-line hover:text-fg hover:bg-muted-hover',
                )}
                title={showFavoritesOnly ? 'Mostrar todas as músicas' : 'Mostrar só favoritos'}
              >
                <Heart
                  className={cn('w-4 h-4', showFavoritesOnly ? 'fill-current' : 'text-fg-subtle')}
                />
                <span className="hidden lg:inline">Favoritos</span>
                {favoritesCount > 0 && (
                  <span
                    className={cn(
                      'ml-0.5 min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-bold inline-flex items-center justify-center',
                      showFavoritesOnly ? 'bg-danger text-white' : 'bg-muted-hover text-fg',
                    )}
                  >
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            {isAuthenticated ? (
              onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="hidden sm:inline-flex items-center gap-1.5 min-h-10 px-3 rounded-button text-xs font-semibold border border-line bg-muted/70 text-fg-muted hover:text-danger-text hover:border-danger-line hover:bg-danger-soft transition-colors"
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={onAdminAuthClick}
                className="btn-gradient inline-flex items-center gap-1.5 h-10 px-3 min-[22.5rem]:px-4 sm:px-5 !rounded-full text-sm font-bold transition-all"
                title="Entrar com e-mail"
                aria-label="Entrar"
              >
                <LogIn className="w-4 h-4" />
                <span className="max-[22.5rem]:hidden">Entrar</span>
              </button>
            )}
          </div>
        </div>

        {/* Busca mobile — só no catálogo */}
        {showMobileSearch && (
          <div className="md:hidden pb-2.5 flex items-center gap-2">
            {renderSearch('mobile')}
            <button
              type="button"
              onClick={onOpenAdvancedSearch}
              title="Filtros e busca avançada"
              aria-label="Filtros e busca avançada"
              className={cn(iconBtn, '!rounded-full')}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
