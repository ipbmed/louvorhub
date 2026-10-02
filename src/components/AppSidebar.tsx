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
  LogOut,
  HelpCircle,
  Download,
  Check,
} from 'lucide-react';
import { ViewMode } from '../types';
import { getAvatarPublicUrl } from '@/utils/avatarUrl';
import { WORKSPACE_VIEWS } from './ChurchWorkspace';
import { usePwa } from '@/contexts/PwaProvider';
import { cn } from './ui/cn';

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

function orgLabel(org: OrgOption | undefined): string {
  if (!org) return 'Igreja';
  const sigla = org.sigla?.trim();
  return sigla || org.name;
}

const NAV_BASE =
  'flex items-center rounded-xl text-sm font-semibold transition-all border touch-manipulation';
const NAV_ACTIVE = 'bg-brand-soft text-brand-text border-brand-line shadow-sm';
const NAV_IDLE = 'bg-transparent text-fg-muted border-transparent hover:bg-muted hover:text-fg';

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
  const { canInstall, promptInstall } = usePwa();

  useEffect(() => {
    if (!orgMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!orgMenuRef.current?.contains(e.target as Node)) setOrgMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [orgMenuOpen]);

  // Fecha o drawer com Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        aria-current={active ? 'page' : undefined}
        className={cn(
          NAV_BASE,
          compact ? 'justify-center w-full px-0 py-2.5' : 'gap-3 w-full px-3 py-2.5 text-left',
          active ? NAV_ACTIVE : NAV_IDLE,
        )}
      >
        <Icon className={cn('w-[18px] h-[18px] shrink-0', active ? 'text-brand-text' : 'text-fg-subtle')} />
        {!compact && <span className="truncate">{label}</span>}
      </button>
    );
  };

  const openWorkspace = () => {
    onViewChange('workspace');
    onClose();
    setOrgMenuOpen(false);
  };

  const renderOrgMenu = (positionClass: string) => (
    <div
      className={cn(
        'absolute z-50 rounded-xl border border-line bg-surface shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150',
        positionClass,
      )}
      role="menu"
    >
      <p className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-fg-subtle font-bold">
        Trocar igreja
      </p>
      {orgOptions.map((o) => {
        const selected = o.id === activeOrgId;
        return (
          <button
            key={o.id}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            onClick={() => {
              onOrgChange(o.id);
              setOrgMenuOpen(false);
              onViewChange('workspace');
              onClose();
            }}
            className={cn(
              'w-full text-left px-3 py-2 text-sm flex items-center gap-2',
              selected ? 'bg-brand-soft text-brand-text font-semibold' : 'text-fg-muted hover:bg-muted hover:text-fg',
            )}
            title={o.name}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{orgLabel(o)}</span>
              {o.sigla?.trim() && o.sigla.trim() !== o.name ? (
                <span className="block text-[10px] text-fg-subtle truncate font-normal">{o.name}</span>
              ) : null}
            </span>
            {selected && <Check className="w-4 h-4 shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  const renderChurchItem = (compact: boolean) => {
    const workspaceActive = WORKSPACE_VIEWS.includes(currentView);
    const iconClass = workspaceActive ? 'text-brand-text' : 'text-fg-subtle';

    if (compact) {
      return (
        <div className="relative" ref={orgMenuRef}>
          <button
            type="button"
            onClick={() => (multiOrg ? setOrgMenuOpen((v) => !v) : openWorkspace())}
            title={activeFullName}
            aria-label={`Abrir igreja: ${activeFullName}`}
            className={cn(NAV_BASE, 'w-full justify-center px-0 py-2.5', workspaceActive ? NAV_ACTIVE : NAV_IDLE)}
          >
            <Church className={cn('w-[18px] h-[18px] shrink-0', iconClass)} />
          </button>
          {orgMenuOpen && multiOrg && renderOrgMenu('left-full top-0 ml-2 w-56')}
        </div>
      );
    }

    return (
      <div className="relative" ref={orgMenuRef}>
        <div className={cn('flex items-stretch rounded-xl border overflow-hidden transition-all', workspaceActive ? NAV_ACTIVE : 'border-line bg-surface-2/60 text-fg-muted hover:bg-muted hover:text-fg')}>
          <button
            type="button"
            onClick={openWorkspace}
            title={activeFullName}
            className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold"
          >
            <Church className={cn('w-[18px] h-[18px] shrink-0', iconClass)} />
            <span className="min-w-0">
              <span className="block truncate">{activeLabel}</span>
              {activeLabel !== activeFullName && (
                <span className="block text-[10px] text-fg-subtle truncate font-normal">{activeFullName}</span>
              )}
            </span>
          </button>
          {multiOrg && (
            <button
              type="button"
              onClick={() => setOrgMenuOpen((v) => !v)}
              className={cn('px-2.5 border-l shrink-0', workspaceActive ? 'border-brand-line text-brand-text' : 'border-line text-fg-subtle')}
              aria-label="Trocar igreja"
              aria-expanded={orgMenuOpen}
              title="Trocar igreja"
            >
              <ChevronDown className={cn('w-4 h-4 transition-transform', orgMenuOpen && 'rotate-180')} />
            </button>
          )}
        </div>
        {orgMenuOpen && multiOrg && renderOrgMenu('left-0 right-0 top-full mt-1')}
      </div>
    );
  };

  const renderUserBlock = (compact: boolean) => (
    <div className={cn('mt-auto shrink-0 border-t border-line bg-surface-2/50', compact ? 'px-2 pt-2 pb-3' : 'px-3 pt-3 pb-4')}>
      {canInstall && (
        <button
          type="button"
          onClick={() => {
            onClose();
            void promptInstall();
          }}
          className={cn(
            'w-full mb-2 rounded-xl border border-brand-line bg-brand-soft text-brand-text hover:brightness-110 transition',
            compact ? 'p-2 flex justify-center' : 'px-3 py-2.5 flex items-center gap-2 text-sm font-semibold',
          )}
          title="Instalar aplicativo"
          aria-label="Instalar aplicativo"
        >
          <Download className="w-4 h-4 shrink-0" />
          {!compact && <span>Instalar app</span>}
        </button>
      )}
      {onOpenHelp && (
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenHelp();
          }}
          className={cn(
            'w-full mb-2 rounded-xl border border-line text-fg-muted hover:text-brand-text hover:border-brand-line hover:bg-muted transition-colors',
            compact ? 'p-2 flex justify-center' : 'px-3 py-2.5 flex items-center gap-2 text-sm font-semibold',
          )}
          title="Ajuda"
          aria-label="Abrir ajuda"
        >
          <HelpCircle className="w-4 h-4 text-brand-text shrink-0" />
          {!compact && <span>Ajuda</span>}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onViewChange('profile');
          onClose();
        }}
        className={cn(
          'w-full rounded-xl border text-left transition-all',
          compact ? 'p-2 flex justify-center' : 'p-3',
          userActive ? 'border-brand-line bg-brand-soft' : 'border-line bg-surface hover:bg-muted hover:border-line-strong/60',
        )}
        title={compact ? `Perfil · ${displayName}` : 'Abrir perfil'}
      >
        <div className={cn('flex items-center', compact ? 'justify-center' : 'gap-3')}>
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted border border-line flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img key={avatarUrl} src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-brand-text">{initials}</span>
            )}
          </div>
          {!compact && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg truncate">{displayName}</p>
                {userEmail && <p className="text-[11px] text-fg-subtle truncate">{userEmail}</p>}
              </div>
              <ChevronRight className={cn('w-4 h-4 shrink-0', userActive ? 'text-brand-text' : 'text-fg-subtle')} />
            </>
          )}
        </div>
      </button>
    </div>
  );

  const renderNav = (compact: boolean) => {
    const personalItems = PERSONAL_NAV.filter(({ visible }) => !visible || visible(permissions));
    const adminItems = ADMIN_NAV.filter(({ visible }) => !visible || visible(permissions));
    const showAdmin = adminItems.length > 0;

    const sectionLabel = (text: string) =>
      !compact && (
        <p className="px-2 mb-1.5 text-[10px] uppercase tracking-wider text-fg-subtle font-bold">{text}</p>
      );

    return (
      <nav className={cn('flex flex-col gap-1 flex-1 overflow-y-auto min-h-0', compact ? 'px-2 pb-2' : 'px-3 pb-3')} aria-label="Navegação principal">
        {personalItems.map((item) => renderNavButton(item, compact))}

        {hasWorkspace && (
          <div className={cn('mt-3 border-t border-line', compact ? 'pt-2' : 'pt-3')}>
            {sectionLabel('Igreja')}
            {renderChurchItem(compact)}
          </div>
        )}

        {showAdmin && (
          <div className={cn('mt-3 border-t border-line', compact ? 'pt-2' : 'pt-3')}>
            {sectionLabel('Administração')}
            <div className="flex flex-col gap-1">{adminItems.map((item) => renderNavButton(item, compact))}</div>
          </div>
        )}
      </nav>
    );
  };

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          'hidden lg:flex shrink-0 flex-col border-r border-line bg-surface h-[calc(100vh-4.5rem)] sticky top-[4.5rem] self-start transition-[width] duration-200 ease-out',
          desktopExpanded ? 'w-64' : 'w-[4.25rem]',
        )}
      >
        <div className={cn('pt-4 pb-2 shrink-0 flex items-center gap-2', desktopExpanded ? 'px-4 justify-between' : 'px-2 justify-center')}>
          {desktopExpanded && <p className="text-[10px] uppercase tracking-wider text-fg-subtle font-bold">Menu</p>}
          {onToggleDesktop && (
            <button
              type="button"
              onClick={onToggleDesktop}
              className="p-1.5 rounded-button text-fg-subtle hover:text-brand-text hover:bg-muted border border-transparent hover:border-line transition-colors"
              title={desktopExpanded ? 'Minimizar menu' : 'Expandir menu'}
              aria-label={desktopExpanded ? 'Minimizar menu' : 'Expandir menu'}
            >
              {desktopExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}
        </div>
        {renderNav(!desktopExpanded)}
        {renderUserBlock(!desktopExpanded)}
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-overlay backdrop-blur-sm !rounded-none animate-in fade-in duration-150"
            aria-label="Fechar menu"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(18rem,85vw)] bg-surface border-r border-line shadow-2xl flex flex-col pt-safe pb-safe animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-line shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center text-emerald-950 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-300/40 shrink-0">
                  <BookOpen className="w-5 h-5" strokeWidth={2.25} />
                </div>
                <p className="text-base font-display font-extrabold text-fg truncate">
                  Louvor<span className="text-brand-text">Hub</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-button text-fg-subtle hover:text-fg hover:bg-muted"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="pt-3 flex-1 min-h-0 flex flex-col">{renderNav(false)}</div>
            {renderUserBlock(false)}
            {onSignOut && (
              <div className="px-3 pb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSignOut();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all border border-line text-fg-muted hover:text-danger-text hover:border-danger-line hover:bg-danger-soft"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4" />
                  Encerrar sessão
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};
