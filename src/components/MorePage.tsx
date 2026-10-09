import React from 'react';
import {
  ChevronRight,
  Download,
  HelpCircle,
  ListMusic,
  LogOut,
  Moon,
  Music2,
  Sun,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type { ViewMode } from '@/types';
import { useTheme } from '@/contexts/ThemeProvider';
import { usePwa } from '@/contexts/PwaProvider';
import { PageHeader } from './PageHeader';
import { Avatar, ListCard, ListRow } from './ui/Kit';
import { cn } from './ui/cn';

interface MorePageProps {
  userName: string;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  roleLabel: string;
  canManageSongs: boolean;
  canManageUsers: boolean;
  onNavigate: (view: ViewMode) => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
}

/** "Mais": atalhos secundários, aparência e sessão. */
export const MorePage: React.FC<MorePageProps> = ({
  userName,
  userEmail,
  userAvatarUrl,
  roleLabel,
  canManageSongs,
  canManageUsers,
  onNavigate,
  onOpenHelp,
  onSignOut,
}) => {
  const { theme, setTheme } = useTheme();
  const { canInstall, promptInstall } = usePwa();

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <PageHeader title="Mais" />

      <button
        type="button"
        onClick={() => onNavigate('profile')}
        className="ui-card w-full !rounded-2xl flex items-center gap-3.5 p-4 text-left hover:shadow-card-lg transition-shadow"
      >
        <Avatar name={userName} src={userAvatarUrl} size={56} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-fg truncate">{userName}</span>
          <span className="block text-[13px] text-fg-muted truncate">{userEmail || roleLabel}</span>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-brand-soft text-brand-text text-[11px] font-bold">
            {roleLabel}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-fg-subtle shrink-0" />
      </button>

      <ListCard>
        <ListRow icon={ListMusic} label="Playlists" description="Suas listas e as compartilhadas com você" onClick={() => onNavigate('setlist')} />
        {canManageSongs && (
          <ListRow icon={Music2} label="Gerenciar músicas" description="Cadastro, categorias e importação" onClick={() => onNavigate('admin')} />
        )}
        {canManageUsers && (
          <ListRow icon={UsersRound} label="Usuários" description="Contas e permissões gerais" onClick={() => onNavigate('accounts')} />
        )}
        <ListRow icon={UserRound} label="Meu perfil" description="Nome, foto e dados de contato" onClick={() => onNavigate('profile')} />
      </ListCard>

      <div className="ui-card p-4">
        <p className="text-sm font-bold text-fg mb-2.5">Aparência</p>
        <div className="grid grid-cols-2 gap-1 p-1 rounded-[14px] bg-surface-2" role="radiogroup" aria-label="Tema">
          {(
            [
              { value: 'light', label: 'Claro', Icon: Sun },
              { value: 'dark', label: 'Escuro', Icon: Moon },
            ] as const
          ).map(({ value, label, Icon }) => {
            const selected = theme === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex items-center justify-center gap-2 min-h-11 !rounded-[11px] text-sm font-semibold transition-all touch-manipulation',
                  selected ? 'bg-surface text-brand-text shadow-card' : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <ListCard>
        {canInstall && (
          <ListRow icon={Download} label="Instalar aplicativo" description="Acesso rápido pela tela inicial" onClick={() => void promptInstall()} />
        )}
        <ListRow icon={HelpCircle} label="Ajuda" description="Como usar o LouvorHub" onClick={onOpenHelp} />
        <ListRow icon={LogOut} label="Sair" tone="danger" onClick={onSignOut} />
      </ListCard>

      <p className="text-center text-xs text-fg-subtle pb-2">LouvorHub · Gestão e Caderno de Louvor</p>
    </div>
  );
};
