import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  ListMusic,
  Building2,
  Users,
  Calendar,
  X,
  Church,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { ViewMode } from '../types';
import { supabase } from '@/lib/supabase';

interface SidebarPermissions {
  canAccessAdminPanel: boolean;
  canManageUsers: boolean;
  canManageChurches: boolean;
  canAccessLiturgies: boolean;
  canManageSchedules: boolean;
  canAccessEvents: boolean;
}

interface AppSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Drawer mobile aberto */
  open: boolean;
  onClose: () => void;
  /** Desktop: expandido (textos) vs minimizado (só ícones) */
  desktopExpanded?: boolean;
  onToggleDesktop?: () => void;
  orgOptions: { id: string; name: string }[];
  activeOrgId?: string;
  onOrgChange: (orgId: string) => void;
  userEmail?: string | null;
  userDisplayName?: string | null;
  userAvatarPath?: string | null;
  permissions: SidebarPermissions;
}

const NAV_ITEMS: {
  view: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible?: (p: SidebarPermissions) => boolean;
}[] = [
  { view: 'public', label: 'Músicas', icon: BookOpen },
  { view: 'admin', label: 'Painel Geral', icon: LayoutDashboard, visible: (p) => p.canAccessAdminPanel },
  { view: 'events', label: 'Eventos', icon: Calendar, visible: (p) => p.canAccessEvents },
  { view: 'setlist', label: 'Playlists', icon: ListMusic },
  { view: 'churches', label: 'Igrejas e Bandas', icon: Building2, visible: (p) => p.canManageChurches },
  { view: 'users', label: 'Usuários e Integrantes', icon: Users, visible: (p) => p.canManageUsers },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onViewChange,
  open,
  onClose,
  desktopExpanded = true,
  onToggleDesktop,
  orgOptions,
  activeOrgId,
  onOrgChange,
  userEmail,
  userDisplayName,
  userAvatarPath,
  permissions,
}) => {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orgMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!orgMenuRef.current?.contains(e.target as Node)) setOrgMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [orgMenuOpen]);

  useEffect(() => {
    if (desktopExpanded) setOrgMenuOpen(false);
  }, [desktopExpanded]);

  const avatarUrl = userAvatarPath
    ? supabase.storage.from('avatars').getPublicUrl(userAvatarPath).data.publicUrl
    : null;

  const displayName = userDisplayName?.trim() || userEmail?.split('@')[0] || 'Usuário';
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userActive = currentView === 'profile';
  const activeOrgName =
    orgOptions.find((o) => o.id === activeOrgId)?.name || 'Igreja ativa';

  const renderUserBlock = (compact: boolean) => (
    <div
      className={`mt-auto shrink-0 border-t border-stone-800/80 bg-stone-950 ${
        compact ? 'px-2 pt-2 pb-3' : 'px-3 pt-3 pb-4'
      }`}
    >
      <button
        type="button"
        onClick={() => {
          onViewChange('profile');
          onClose();
        }}
        className={`w-full rounded-button border text-left transition-all ${
          compact ? 'p-2 flex justify-center' : 'p-3'
        } ${
          userActive
            ? 'border-emerald-500/40 bg-emerald-500/15'
            : 'border-stone-800 bg-stone-900/70 hover:bg-stone-800/80 hover:border-stone-700'
        }`}
        title={compact ? `Perfil · ${displayName}` : 'Abrir perfil'}
      >
        <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-emerald-300">{initials}</span>
            )}
          </div>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-100 truncate">{displayName}</p>
                {userEmail && (
                  <p className="text-[11px] text-stone-500 truncate">{userEmail}</p>
                )}
              </div>
              <ChevronRight
                className={`w-4 h-4 shrink-0 ${userActive ? 'text-emerald-400' : 'text-stone-600'}`}
              />
            </>
          )}
        </div>
      </button>
    </div>
  );

  const renderOrgSelect = (compact: boolean) => {
    if (!orgOptions.length) return null;

    if (compact) {
      return (
        <div className="px-2 pb-2 relative" ref={orgMenuRef}>
          <button
            type="button"
            onClick={() => setOrgMenuOpen((v) => !v)}
            className="w-full flex items-center justify-center p-2.5 rounded-button border border-stone-800 bg-stone-900/70 text-emerald-400 hover:bg-stone-800 hover:border-stone-700"
            title={activeOrgName}
            aria-label={`Igreja ativa: ${activeOrgName}`}
          >
            <Church className="w-4 h-4" />
          </button>
          {orgMenuOpen && (
            <div className="absolute left-full top-0 ml-2 z-50 w-56 rounded-xl border border-stone-700 bg-stone-900 shadow-xl py-1">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                Igreja ativa
              </p>
              {orgOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onOrgChange(o.id);
                    setOrgMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm truncate ${
                    o.id === activeOrgId
                      ? 'bg-emerald-500/15 text-emerald-200 font-semibold'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {o.name}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="px-3 pb-3">
        <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-stone-500 font-bold mb-1.5">
          <Church className="w-3 h-3" />
          Igreja ativa
        </label>
        <select
          value={activeOrgId || ''}
          onChange={(e) => onOrgChange(e.target.value)}
          className="w-full bg-stone-900 border border-stone-700 text-stone-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600"
          title="Trocar igreja"
        >
          {orgOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderNav = (compact: boolean) => (
    <nav
      className={`flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 ${
        compact ? 'px-2 pb-2' : 'px-3 pb-3'
      }`}
    >
      {NAV_ITEMS.filter(({ visible }) => !visible || visible(permissions)).map(
        ({ view, label, icon: Icon }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              type="button"
              onClick={() => {
                onViewChange(view);
                onClose();
              }}
              title={compact ? label : undefined}
              className={`flex items-center rounded-button text-sm font-semibold transition-all border ${
                compact
                  ? 'justify-center w-full px-0 py-2.5'
                  : 'gap-3 w-full px-3 py-2.5 text-left'
              } ${
                active
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-sm'
                  : 'bg-transparent text-stone-300 border-transparent hover:bg-stone-800/80 hover:text-stone-100'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : 'text-stone-500'}`}
              />
              {!compact && <span>{label}</span>}
            </button>
          );
        },
      )}
    </nav>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex shrink-0 flex-col border-r border-stone-800 bg-stone-950/95 h-[calc(100vh-4rem)] sm:h-[calc(100vh-5rem)] sticky top-16 sm:top-20 self-start transition-[width] duration-200 ease-out ${
          desktopExpanded ? 'w-64' : 'w-[4.25rem]'
        }`}
      >
        <div
          className={`pt-4 pb-2 shrink-0 flex items-center gap-2 ${
            desktopExpanded ? 'px-4 justify-between' : 'px-2 justify-center'
          }`}
        >
          {desktopExpanded && (
            <p className="text-[10px] uppercase tracking-wider text-stone-500 font-bold">Menu</p>
          )}
          {onToggleDesktop && (
            <button
              type="button"
              onClick={onToggleDesktop}
              className="p-1.5 rounded-button text-stone-500 hover:text-emerald-300 hover:bg-stone-800 border border-transparent hover:border-stone-700"
              title={desktopExpanded ? 'Minimizar menu' : 'Expandir menu'}
              aria-label={desktopExpanded ? 'Minimizar menu' : 'Expandir menu'}
            >
              {desktopExpanded ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <div className="shrink-0">{renderOrgSelect(!desktopExpanded)}</div>
        {renderNav(!desktopExpanded)}
        {renderUserBlock(!desktopExpanded)}
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/70 backdrop-blur-sm rounded-button"
            aria-label="Fechar menu"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(18rem,85vw)] bg-stone-950 border-r border-stone-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-stone-800 shrink-0">
              <p className="text-sm font-serif font-bold text-emerald-200">Menu</p>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-button text-stone-400 hover:text-stone-100 hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="pt-3 shrink-0">{renderOrgSelect(false)}</div>
            {renderNav(false)}
            {renderUserBlock(false)}
          </aside>
        </div>
      )}
    </>
  );
};
