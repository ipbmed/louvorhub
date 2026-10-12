import React from 'react';
import { LogOut, Menu } from 'lucide-react';
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
  /** Mini menu (só ícones com rótulo curto), como no YouTube. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
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
  collapsed = false,
  onToggleCollapsed,
}) => {
  const activeSection = sectionOf(currentView);
  const main: NavSection[] = [
    'home',
    'songs',
    ...(showAgenda ? (['agenda'] as const) : []),
    'playlists',
    'churches',
    ...(showAccounts ? (['accounts'] as const) : []),
  ];

  const renderLink = (key: NavSection, label?: string, shortLabel?: string) => {
    const { view, label: defaultLabel, icon: Icon } = NAV[key];
    const active = activeSection === key;
    const text = label ?? defaultLabel;
    return (
      <button
        key={key}
        type="button"
        onClick={() => onViewChange(view)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? text : undefined}
        className={cn(
          'w-full flex items-center transition-colors',
          collapsed
            ? 'flex-col justify-center gap-1.5 px-1 py-3 text-[10px] font-medium !rounded-xl'
            : 'gap-3 px-3.5 min-h-11 text-[15px] font-semibold',
          active ? 'bg-brand-soft text-brand-text' : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        )}
      >
        <Icon className={cn('shrink-0', collapsed ? 'w-[22px] h-[22px]' : 'w-5 h-5')} strokeWidth={active ? 2.4 : 2} />
        <span className={cn('truncate', collapsed && 'max-w-full')}>{collapsed ? (shortLabel ?? text) : text}</span>
      </button>
    );
  };

  return (
    <aside
      className={cn(
        'hidden lg:flex fixed inset-y-0 left-0 z-30 flex-col bg-surface border-r border-line',
        collapsed ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div className={cn('h-[72px] flex items-center gap-2 shrink-0', collapsed ? 'justify-center' : 'px-3')}>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="w-10 h-10 inline-flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-2 !rounded-full shrink-0 transition-colors"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {!collapsed && <Logo onClick={() => onViewChange('home')} />}
      </div>

      <nav
        className={cn(
          'flex-1 min-h-0 overflow-y-auto pb-3 flex flex-col gap-1',
          collapsed ? 'px-1.5 [scrollbar-width:none]' : 'px-3',
        )}
        aria-label="Navegação principal"
      >
        {main.map((key) => renderLink(key))}
        <div className="my-2 border-t border-line" />
        {renderLink('more', 'Mais opções', 'Mais')}
      </nav>

      {collapsed ? (
        <div className="p-1.5 pb-3 shrink-0 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onViewChange('profile')}
            className={cn(
              'p-1 !rounded-full transition-colors hover:bg-surface-2',
              currentView === 'profile' && 'ring-2 ring-brand-line',
            )}
            title={`${userName} — Meu perfil`}
            aria-label="Meu perfil"
          >
            <Avatar name={userName} src={userAvatarUrl} size={36} />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="w-10 h-10 inline-flex items-center justify-center text-fg-subtle hover:text-danger-text hover:bg-danger-soft transition-colors"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      ) : (
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
      )}
    </aside>
  );
};
