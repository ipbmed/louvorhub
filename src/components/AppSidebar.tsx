import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ListMusic,
  UserCheck,
  X,
  Church,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Music,
  LockOpen,
  HelpCircle,
} from 'lucide-react';
import { ViewMode } from '../types';
import { getAvatarPublicUrl } from '@/utils/avatarUrl';
import { WORKSPACE_VIEWS } from './ChurchWorkspace';

interface SidebarPermissions {
  canAccessAdminPanel: boolean;
  canManageUsers: boolean;
  canManageOrgMembers: boolean;
  canManageChurches: boolean;
  canAccessLiturgies: boolean;
  canManageSchedules: boolean;
  canAccessEvents: boolean;
}

type OrgOption = {
  id: string;
  name: string;
  sigla?: string | null;
};

interface AppSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  /** Drawer mobile aberto */
  open: boolean;
  onClose: () => void;
  /** Desktop: expandido (textos) vs minimizado (só ícones) */
  desktopExpanded?: boolean;
  onToggleDesktop?: () => void;
  orgOptions: OrgOption[];
  activeOrgId?: string;
  onOrgChange: (orgId: string) => void;
  userEmail?: string | null;
  userDisplayName?: string | null;
  userAvatarPath?: string | null;
  userAvatarUpdatedAt?: string | null;
  permissions: SidebarPermissions;
  onSignOut?: () => void;
  onOpenHelp?: () => void;
}

type NavItem = {
  view: ViewMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  visible?: (p: SidebarPermissions) => boolean;
};

const PERSONAL_NAV: NavItem[] = [
  { view: 'public', label: 'Catálogo', icon: BookOpen },
  { view: 'setlist', label: 'Playlists', icon: ListMusic },
];

const ADMIN_NAV: NavItem[] = [
  { view: 'admin', label: 'Músicas', icon: Music, visible: (p) => p.canAccessAdminPanel },
  { view: 'organizations', label: 'Igrejas', icon: Church, visible: (p) => p.canAccessAdminPanel },
  { view: 'accounts', label: 'Contas de usuários', icon: UserCheck, visible: (p) => p.canManageUsers },
];

const ADMIN_VIEWS: ViewMode[] = ['admin', 'organizations', 'accounts'];

function orgLabel(org: OrgOption | undefined): string {
  if (!org) return 'Igreja';
  const sigla = org.sigla?.trim();
  return sigla || org.name;
}

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
  userAvatarUpdatedAt,
  permissions,
  onSignOut,
  onOpenHelp,
}) => {
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);
  const hasWorkspace = orgOptions.length > 0;
  const multiOrg = orgOptions.length > 1;

  useEffect(() => {
    if (!orgMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!orgMenuRef.current?.contains(e.target as Node)) setOrgMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [orgMenuOpen]);

  const avatarUrl = getAvatarPublicUrl(userAvatarPath, userAvatarUpdatedAt);

  const displayName = userDisplayName?.trim() || userEmail?.split('@')[0] || 'Usuário';
  const initials = displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const userActive = currentView === 'profile';
  const activeOrg = orgOptions.find((o) => o.id === activeOrgId) || orgOptions[0];
  const activeLabel = orgLabel(activeOrg);
  const activeFullName = activeOrg?.name || 'Igreja';

  const renderNavButton = (item: NavItem, compact: boolean) => {
    const { view, label, icon: Icon } = item;
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
            ? 'bg-emerald-500/20 light:bg-emerald-50 text-emerald-200 light:text-emerald-800 border-emerald-500/40 light:border-emerald-300 shadow-sm'
            : 'bg-transparent text-stone-300 light:text-stone-700 border-transparent hover:bg-stone-800/80 light:hover:bg-stone-100 hover:text-stone-100 light:hover:text-stone-900'
        }`}
      >
        <Icon
          className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400 light:text-emerald-600' : 'text-stone-500 light:text-stone-400'}`}
        />
        {!compact && <span>{label}</span>}
      </button>
    );
  };

  const openWorkspace = () => {
    onViewChange('workspace');
    onClose();
    setOrgMenuOpen(false);
  };

  const renderChurchItem = (compact: boolean) => {
    const workspaceActive = WORKSPACE_VIEWS.includes(currentView);
    const activeClass = workspaceActive
      ? 'bg-emerald-500/20 light:bg-emerald-50 text-emerald-200 light:text-emerald-800 border-emerald-500/40 light:border-emerald-300 shadow-sm'
      : 'bg-transparent text-stone-300 light:text-stone-700 border-transparent hover:bg-stone-800/80 light:hover:bg-stone-100 hover:text-stone-100 light:hover:text-stone-900';
    const iconClass = workspaceActive
      ? 'text-emerald-400 light:text-emerald-600'
      : 'text-stone-500 light:text-stone-400';

    if (compact) {
      return (
        <div className="relative" ref={orgMenuRef}>
          <button
            type="button"
            onClick={() => {
              if (multiOrg) setOrgMenuOpen((v) => !v);
              else openWorkspace();
            }}
            title={activeFullName}
            aria-label={`Abrir workspace: ${activeFullName}`}
            className={`w-full flex items-center justify-center px-0 py-2.5 rounded-button text-sm font-semibold transition-all border ${activeClass}`}
          >
            <Church className={`w-4 h-4 shrink-0 ${iconClass}`} />
          </button>
          {orgMenuOpen && multiOrg && (
            <div className="absolute left-full top-0 ml-2 z-50 w-56 rounded-xl border border-stone-700 bg-stone-900 shadow-xl py-1">
              <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                Trocar igreja
              </p>
              {orgOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onOrgChange(o.id);
                    setOrgMenuOpen(false);
                    onViewChange('workspace');
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-2 text-sm truncate ${
                    o.id === activeOrgId
                      ? 'bg-emerald-500/15 text-emerald-200 font-semibold'
                      : 'text-stone-300 hover:bg-stone-800'
                  }`}
                  title={o.name}
                >
                  {orgLabel(o)}
                  {o.sigla?.trim() && o.sigla.trim() !== o.name ? (
                    <span className="block text-[10px] text-stone-500 truncate font-normal">{o.name}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative" ref={orgMenuRef}>
        <div
          className={`flex items-stretch rounded-button border overflow-hidden transition-all ${activeClass}`}
        >
          <button
            type="button"
            onClick={openWorkspace}
            title={activeFullName}
            className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold"
          >
            <Church className={`w-4 h-4 shrink-0 ${iconClass}`} />
            <span className="truncate">{activeLabel}</span>
          </button>
          {multiOrg && (
            <button
              type="button"
              onClick={() => setOrgMenuOpen((v) => !v)}
              className={`px-2.5 border-l shrink-0 ${
                workspaceActive
                  ? 'border-emerald-500/30 text-emerald-300 light:text-emerald-700 light:border-emerald-300'
                  : 'border-stone-700/80 light:border-stone-200 text-stone-500'
              }`}
              aria-label="Trocar igreja"
              title="Trocar igreja"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          )}
        </div>
        {orgMenuOpen && multiOrg && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-stone-700 light:border-stone-200 bg-stone-900 light:bg-white shadow-xl py-1">
            {orgOptions.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  onOrgChange(o.id);
                  setOrgMenuOpen(false);
                  onViewChange('workspace');
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 text-sm truncate ${
                  o.id === activeOrgId
                    ? 'bg-emerald-500/15 text-emerald-200 light:text-emerald-800 font-semibold'
                    : 'text-stone-300 light:text-stone-700 hover:bg-stone-800 light:hover:bg-stone-100'
                }`}
                title={o.name}
              >
                {orgLabel(o)}
                {o.sigla?.trim() && o.sigla.trim() !== o.name ? (
                  <span className="block text-[10px] text-stone-500 truncate font-normal">{o.name}</span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderUserBlock = (compact: boolean) => (
    <div
      className={`mt-auto shrink-0 border-t border-stone-800/80 light:border-stone-200 bg-stone-950 light:bg-stone-50 ${
        compact ? 'px-2 pt-2 pb-3' : 'px-3 pt-3 pb-4'
      }`}
    >
      {onOpenHelp && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenHelp();
          }}
          className={`w-full mb-2 rounded-button border border-stone-800 light:border-stone-200 text-stone-300 light:text-stone-700 hover:text-emerald-300 light:hover:text-emerald-700 hover:border-emerald-700/50 light:hover:border-emerald-300 hover:bg-stone-900 light:hover:bg-stone-100 transition-colors ${
            compact ? 'p-2 flex justify-center' : 'px-3 py-2.5 flex items-center gap-2 text-sm font-semibold'
          }`}
          title="Ajuda"
          aria-label="Abrir ajuda"
        >
          <HelpCircle className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
          {!compact && <span>Ajuda</span>}
        </button>
      )}
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
            ? 'border-emerald-500/40 light:border-emerald-300 bg-emerald-500/15 light:bg-emerald-50'
            : 'border-stone-800 light:border-stone-200 bg-stone-900/70 light:bg-white hover:bg-stone-800/80 light:hover:bg-stone-100 hover:border-stone-700 light:hover:border-stone-300'
        }`}
        title={compact ? `Perfil · ${displayName}` : 'Abrir perfil'}
      >
        <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'}`}>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-800 light:bg-stone-100 border border-stone-700 light:border-stone-200 flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img key={avatarUrl} src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-emerald-300 light:text-emerald-700">{initials}</span>
            )}
          </div>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-100 light:text-stone-900 truncate">{displayName}</p>
                {userEmail && (
                  <p className="text-[11px] text-stone-500 light:text-stone-600 truncate">{userEmail}</p>
                )}
              </div>
              <ChevronRight
                className={`w-4 h-4 shrink-0 ${userActive ? 'text-emerald-400 light:text-emerald-600' : 'text-stone-600 light:text-stone-400'}`}
              />
            </>
          )}
        </div>
      </button>
    </div>
  );

  const renderNav = (compact: boolean) => {
    const personalItems = PERSONAL_NAV.filter(({ visible }) => !visible || visible(permissions));
    const adminItems = ADMIN_NAV.filter(({ visible }) => !visible || visible(permissions));
    const adminActive = ADMIN_VIEWS.includes(currentView);
    const showAdmin = adminItems.length > 0;

    return (
      <nav
        className={`flex flex-col gap-1 flex-1 overflow-y-auto min-h-0 ${
          compact ? 'px-2 pb-2' : 'px-3 pb-3'
        }`}
      >
        {personalItems.map((item) => renderNavButton(item, compact))}

        {hasWorkspace && (
          <div className={`mt-3 ${compact ? 'pt-2' : 'pt-3'} border-t border-stone-800/80`}>
            {!compact && (
              <p className="px-1 mb-2 text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                Igreja
              </p>
            )}
            {renderChurchItem(compact)}
          </div>
        )}

        {showAdmin && (
          <div className={`mt-3 ${compact ? 'pt-2' : 'pt-3'} border-t border-stone-800/80`}>
            {!compact && (
              <p className="px-1 mb-2 text-[10px] uppercase tracking-wider text-stone-500 font-bold">
                Administração
              </p>
            )}
            <div
              className={`flex flex-col gap-1 ${
                adminActive && !compact
                  ? 'rounded-2xl border border-violet-500/20 bg-violet-500/5 p-1.5'
                  : ''
              }`}
            >
              {adminItems.map((item) => renderNavButton(item, compact))}
            </div>
          </div>
        )}
      </nav>
    );
  };

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
            <div className="flex items-center justify-between px-4 py-4 border-b border-stone-800 light:border-stone-200 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-stone-950 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400/30 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <p className="text-base font-display font-bold text-emerald-100 light:text-emerald-800 truncate">
                  LouvorHub
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-button text-stone-400 hover:text-stone-100 light:hover:text-stone-800 hover:bg-stone-800 light:hover:bg-stone-100"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderNav(false)}
            {renderUserBlock(false)}
            {onSignOut && (
              <div className="px-3 pb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="w-full px-3 py-2.5 rounded-button text-sm font-semibold flex items-center justify-center gap-2 transition-all border bg-emerald-950/60 text-emerald-300 border-emerald-700/60 shadow-sm"
                  title="Sair"
                >
                  <LockOpen className="w-4 h-4 text-emerald-400" />
                  Sair
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};
