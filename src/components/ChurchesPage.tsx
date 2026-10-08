import React from 'react';
import { Building2, Check, ChevronRight, Church, KeyRound, MapPin, Plus, Settings2, UsersRound } from 'lucide-react';
import { PageHeaderButton, PageShell } from './PageHeader';
import { Button, EmptyState, Fab, Input } from './ui';

export interface ChurchListItem {
  id: string;
  name: string;
  city?: string;
  sigla?: string | null;
  color?: string | null;
}

interface ChurchesPageProps {
  churches: ChurchListItem[];
  activeOrgId?: string | null;
  groupsCount: (churchId: string) => number;
  membersCount?: number;
  onOpen: (churchId: string) => void;
  /** Administradores: gerenciar todas as igrejas do sistema. */
  onManageAll?: () => void;
  onCreate?: () => void;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onJoin: () => void;
}

const DEFAULT_COLOR = '#4f46e5';

function markText(c: ChurchListItem): string {
  const s = c.sigla?.trim();
  if (s) return s.slice(0, 4).toUpperCase();
  return c.name
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Lista de igrejas do usuário (cartões com a cor de cada igreja). */
export const ChurchesPage: React.FC<ChurchesPageProps> = ({
  churches,
  activeOrgId,
  groupsCount,
  membersCount,
  onOpen,
  onManageAll,
  onCreate,
  joinCode,
  onJoinCodeChange,
  onJoin,
}) => (
  <PageShell
      width="narrow"
      icon={Church}
      title="Igrejas"
      description={
        churches.length === 1 ? '1 igreja vinculada à sua conta' : `${churches.length} igrejas vinculadas à sua conta`
      }
      actions={
        onManageAll ? (
          <PageHeaderButton icon={Settings2} onClick={onManageAll}>
            <span className="hidden xs:inline">Gerenciar todas</span>
            <span className="xs:hidden">Gerenciar</span>
          </PageHeaderButton>
        ) : undefined
      }
  >

    {churches.length === 0 ? (
      <EmptyState
        icon={Building2}
        title="Você ainda não participa de uma igreja"
        description="Peça o código de convite ao líder da sua igreja e informe abaixo."
      />
    ) : (
      <div className="space-y-3">
        {churches.map((c) => {
          const color = c.color || DEFAULT_COLOR;
          const active = c.id === activeOrgId;
          const groups = groupsCount(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpen(c.id)}
              className="ui-card w-full !rounded-2xl text-left flex items-center gap-3.5 p-4 border-l-[5px] hover:-translate-y-0.5 hover:shadow-card-lg transition-all"
              style={{ borderLeftColor: color }}
            >
              <span
                className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 text-[13px] font-extrabold tracking-tight"
                style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, var(--surface))`, color }}
              >
                {markText(c) || <Building2 className="w-5 h-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-bold text-fg truncate">{c.name}</span>
                  {active && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-brand-soft text-brand-text text-[11px] font-bold shrink-0">
                      <Check className="w-3 h-3" />
                      Ativa
                    </span>
                  )}
                </span>
                {c.city && (
                  <span className="flex items-center gap-1 text-[13px] text-fg-muted mt-0.5 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {c.city}
                  </span>
                )}
                <span className="flex items-center gap-3 text-xs text-fg-subtle mt-1.5">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" />
                    {groups} {groups === 1 ? 'grupo' : 'grupos'}
                  </span>
                  {active && membersCount != null && membersCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <UsersRound className="w-3.5 h-3.5" />
                      {membersCount} {membersCount === 1 ? 'membro' : 'membros'}
                    </span>
                  )}
                </span>
              </span>
              <ChevronRight className="w-5 h-5 text-fg-subtle shrink-0" />
            </button>
          );
        })}
      </div>
    )}

    <form
      className="ui-card p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onJoin();
      }}
    >
      <div>
        <p className="text-sm font-bold text-fg">Participar de outra igreja</p>
        <p className="text-xs text-fg-muted mt-0.5">Informe o código de convite recebido do líder.</p>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <KeyRound className="w-4 h-4 text-fg-subtle absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={joinCode}
            onChange={(e) => onJoinCodeChange(e.target.value)}
            placeholder="Código de convite"
            aria-label="Código de convite"
            className="pl-9"
            autoCapitalize="characters"
          />
        </div>
        <Button type="submit" disabled={!joinCode.trim()}>
          Entrar
        </Button>
      </div>
    </form>

    {onCreate && <Fab icon={Plus} label="Nova igreja" onClick={onCreate} />}
  </PageShell>
);
