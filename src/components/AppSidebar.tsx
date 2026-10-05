import React from 'react';
import { LogOut } from 'lucide-react';
import type { ViewMode } from '../types';
import { Logo } from './Logo';
import { NAV, sectionOf, type NavSection } from './privateNav';
import { Avatar } from './ui/Kit';
import { cn } from './ui/cn';

interface AppSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  userName: string;
  userAvatarUrl?: string | null;
  roleLabel: string;
  showAgenda: boolean;
  showAccounts: boolean;
  onSignOut: () => void;
}

/** Menu lateral fixo do ambiente privado (desktop). */
export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onViewChange,
  userName,
  userAvatarUrl,
  roleLabel,
  showAgenda,
  showAccounts,
  onSignOut,
}) => {
  const activeSection = sectionOf(currentView);
  const main: NavSection[] = [
    'home',
    ...(showAgenda ? (['agenda'] as const) : []),
    'songs',
    'playlists',
    'churches',
    ...(showAccounts ? (['accounts'] as const) : []),
  ];

  const renderLink = (key: NavSection, label?: string) => {
    const { view, label: defaultLabel, icon: Icon } = NAV[key];
    const active = activeSection === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onViewChange(view)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'w-full flex items-center gap-3 px-3.5 min-h-11 text-[15px] font-semibold transition-colors',
          active ? 'bg-brand-soft text-brand-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
        <span className="truncate">{label ?? defaultLabel}</span>
      </button>
    );
  };

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col bg-surface border-r border-line">
      <div className="h-[72px] px-5 flex items-center shrink-0">
        <Logo onClick={() => onViewChange('home')} />
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 flex flex-col gap-1" aria-label="Navegação principal">
        {main.map((key) => renderLink(key))}
        <div className="my-2 border-t border-line" />
        {renderLink('more', 'Mais opções')}
      </nav>

      <div className="p-3 shrink-0">
        <div
          className={cn(
            'flex items-center gap-3 p-2.5 rounded-2xl bg-surface-2',
            currentView === 'profile' && 'ring-1 ring-brand-line',
          )}
        >
          <button
            type="button"
            onClick={() => onViewChange('profile')}
            className="flex items-center gap-3 min-w-0 flex-1 text-left !rounded-xl"
            title="Meu perfil"
          >
            <Avatar name={userName} src={userAvatarUrl} size={38} />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-fg truncate">{userName}</span>
              <span className="block text-xs text-fg-subtle truncate">{roleLabel}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-9 h-9 inline-flex items-center justify-center text-fg-subtle hover:text-danger-text hover:bg-danger-soft transition-colors shrink-0"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </aside>
  );
};
