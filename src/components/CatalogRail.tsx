import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Download, Heart, LogIn, Moon, Music2, SlidersHorizontal, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeProvider';
import { usePwa } from '@/contexts/PwaProvider';
import { useToast } from '@/contexts/ToastProvider';
import { PublicEventsFab } from './PublicEventsFab';
import { cn } from './ui/cn';

interface CatalogRailProps {
  onHome: () => void;
  onLogin: () => void;
  onOpenAdvancedSearch: () => void;
  onToggleFavoritesOnly: () => void;
  showFavoritesOnly: boolean;
  favoritesCount: number;
  showPublicEvents: boolean;
}

const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <span
    role="presentation"
    className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 whitespace-nowrap rounded-lg bg-fg px-2.5 py-1.5 text-xs font-semibold text-app opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
  >
    {label}
  </span>
);

interface RailButtonProps {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  active?: boolean;
  badge?: number;
  iconClassName?: string;
}

const RailButton: React.FC<RailButtonProps> = ({ label, icon: Icon, onClick, active, badge, iconClassName }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={active}
    className={cn(
      'group relative w-11 h-11 !rounded-full flex items-center justify-center transition-colors',
      active ? 'bg-muted text-fg' : 'text-fg-muted hover:bg-muted hover:text-fg',
    )}
  >
    <Icon className={cn('w-[22px] h-[22px]', iconClassName)} />
    {badge != null && badge > 0 && (
      <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-brand text-white text-[9px] font-black flex items-center justify-center ring-2 ring-surface-2 tabular-nums">
        {badge > 99 ? '99+' : badge}
      </span>
    )}
    <Tooltip label={label} />
  </button>
);

/** Barra de ícones do catálogo dividido (desktop, visitantes). */
export const CatalogRail: React.FC<CatalogRailProps> = ({
  onHome,
  onLogin,
  onOpenAdvancedSearch,
  onToggleFavoritesOnly,
  showFavoritesOnly,
  favoritesCount,
  showPublicEvents,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { canInstall, install, isStandalone } = usePwa();
  const { showToast } = useToast();
  const isDark = theme === 'dark';

  const handleInstall = () => {
    if (canInstall) {
      void install();
      return;
    }
    showToast('Para instalar, use o ícone de instalação na barra de endereço ou o menu do navegador.');
  };

  return (
    <nav
      aria-label="Ações"
      className="relative z-30 h-full w-full flex flex-col items-center gap-1.5 py-3 bg-surface-2 border-r border-line"
    >
      <button
        type="button"
        onClick={onHome}
        aria-label="LouvorHub — catálogo"
        className="group relative btn-gradient w-11 h-11 !rounded-[14px] flex items-center justify-center mb-1"
      >
        <Music2 className="w-[22px] h-[22px]" strokeWidth={2.4} />
        <Tooltip label="LouvorHub" />
      </button>

      <span className="w-8 h-px bg-line my-1.5" aria-hidden />

      <RailButton label="Busca avançada" icon={SlidersHorizontal} onClick={onOpenAdvancedSearch} />
      <RailButton
        label={showFavoritesOnly ? 'Mostrar todas as músicas' : 'Favoritos'}
        icon={Heart}
        onClick={onToggleFavoritesOnly}
        active={showFavoritesOnly}
        badge={favoritesCount}
        iconClassName={showFavoritesOnly ? 'fill-rose-500 text-rose-500' : undefined}
      />
      <PublicEventsFab enabled={showPublicEvents} variant="rail" />

      <div className="mt-auto flex flex-col items-center gap-1.5">
        {!isStandalone && <RailButton label="Instalar aplicativo" icon={Download} onClick={handleInstall} />}
        <RailButton
          label={isDark ? 'Tema claro' : 'Tema escuro'}
          icon={isDark ? Sun : Moon}
          onClick={toggleTheme}
          iconClassName={isDark ? 'text-amber-300' : undefined}
        />
        <span className="w-8 h-px bg-line my-1.5" aria-hidden />
        <button
          type="button"
          onClick={onLogin}
          aria-label="Entrar"
          className="group relative btn-gradient w-11 h-11 !rounded-full flex items-center justify-center"
        >
          <LogIn className="w-5 h-5" />
          <Tooltip label="Entrar" />
        </button>
      </div>
    </nav>
  );
};
