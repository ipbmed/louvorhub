import React from 'react';
import { BookOpen, Church, ListMusic, Menu, UserRound } from 'lucide-react';
import type { ViewMode } from '../types';
import { WORKSPACE_VIEWS } from './ChurchWorkspace';
import { cn } from './ui/cn';

interface MobileNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  hasWorkspace: boolean;
  onOpenMenu: () => void;
  /** Esconde a barra (ex.: leitura de música / telão). */
  hidden?: boolean;
}

type Item = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  onClick: () => void;
};

/**
 * Barra de navegação inferior (somente mobile, usuário logado).
 * Dá acesso com o polegar às áreas principais, como num app nativo.
 */
export const MobileNav: React.FC<MobileNavProps> = ({
  currentView,
  onViewChange,
  hasWorkspace,
  onOpenMenu,
  hidden = false,
}) => {
  if (hidden) return null;

  const items: Item[] = [
    {
      key: 'public',
      label: 'Catálogo',
      icon: BookOpen,
      active: currentView === 'public',
      onClick: () => onViewChange('public'),
    },
    {
      key: 'setlist',
      label: 'Playlists',
      icon: ListMusic,
      active: currentView === 'setlist',
      onClick: () => onViewChange('setlist'),
    },
    ...(hasWorkspace
      ? [
          {
            key: 'workspace',
            label: 'Igreja',
            icon: Church,
            active: WORKSPACE_VIEWS.includes(currentView),
            onClick: () => onViewChange('workspace'),
          } satisfies Item,
        ]
      : []),
    {
      key: 'profile',
      label: 'Perfil',
      icon: UserRound,
      active: currentView === 'profile',
      onClick: () => onViewChange('profile'),
    },
    {
      key: 'menu',
      label: 'Menu',
      icon: Menu,
      active: false,
      onClick: onOpenMenu,
    },
  ];

  return (
    <nav
      aria-label="Navegação rápida"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line pb-safe shadow-[0_-4px_24px_-12px_rgb(0_0_0/0.35)]"
    >
      <ul className="grid auto-cols-fr grid-flow-col h-[4.25rem] px-1">
        {items.map(({ key, label, icon: Icon, active, onClick }) => (
          <li key={key} className="min-w-0">
            <button
              type="button"
              onClick={onClick}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold tracking-wide transition-colors touch-manipulation !rounded-none',
                active ? 'text-brand-text' : 'text-fg-subtle hover:text-fg',
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center w-12 h-7 rounded-full transition-colors',
                  active && 'bg-brand-soft',
                )}
              >
                <Icon className="w-[20px] h-[20px]" strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className="truncate max-w-full">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
