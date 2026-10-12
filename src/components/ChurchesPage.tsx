import React from 'react';
import { Building2, Check, ChevronRight, Church, KeyRound, MapPin, MousePointerClick, Plus, UsersRound } from 'lucide-react';
import { PageHeaderButton, PageShell } from './PageHeader';
import { Button, EmptyState, Input, cn } from './ui';

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
  /** Administradores: cadastrar uma nova igreja. */
  onCreate?: () => void;
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onJoin: () => void;
  /** Tela grande: lista à esquerda e o conteúdo da igreja selecionada à direita (como em Playlists). */
  split?: boolean;
  /** Conteúdo do painel direito no modo dividido; vazio mostra uma orientação. */
  detail?: React.ReactNode;
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

/** Lista de igrejas do usuário (cartões no celular; lista + detalhe em tela grande). */
export const ChurchesPage: React.FC<ChurchesPageProps> = ({
  churches,
  activeOrgId,
  groupsCount,
  membersCount,
  onOpen,
  onCreate,
  joinCode,
  onJoinCodeChange,
  onJoin,
  split = false,
  detail,
}) => {
  const joinForm = (compact: boolean) => (
    <form
      className={cn(compact ? 'p-3 space-y-2' : 'ui-card p-4 space-y-3')}
      onSubmit={(e) => {
        e.preventDefault();
        onJoin();
      }}
    >
      <div>
        <p className={cn('font-bold text-fg', compact ? 'text-xs' : 'text-sm')}>Participar de outra igreja</p>
        {!compact && <p className="text-xs text-fg-muted mt-0.5">Informe o código de convite recebido do líder.</p>}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
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
  );

  return (
    <PageShell
      width={split ? 'full' : 'narrow'}
      icon={Church}
      title="Igrejas"
      description={
        churches.length === 1 ? '1 igreja vinculada à sua conta' : `${churches.length} igrejas vinculadas à sua conta`
      }
      actions={
        onCreate ? (
          <PageHeaderButton icon={Plus} onClick={onCreate}>
            Adicionar
          </PageHeaderButton>
        ) : undefined
      }
    >
      {split ? (
        <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)] 2xl:grid-cols-[26rem_minmax(0,1fr)] lg:items-start lg:-mt-3 lg:-ml-4 lg:-mb-8">
          <aside className="lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] flex flex-col bg-surface border-r border-line">
            <nav aria-label="Minhas igrejas" className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-0.5">
              {churches.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-fg-muted">
                  Você ainda não participa de uma igreja. Use o código de convite abaixo.
                </p>
              ) : (
                churches.map((c) => {
                  const color = c.color || DEFAULT_COLOR;
                  const selected = c.id === activeOrgId;
                  const groups = groupsCount(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onOpen(c.id)}
                      aria-current={selected ? 'true' : undefined}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left !rounded-lg transition-colors',
                        selected ? 'bg-brand-soft' : 'hover:bg-surface-2',
                      )}
                    >
                      <span
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold tracking-tight"
                        style={
                          selected
                            ? { backgroundColor: color, color: '#fff' }
                            : { backgroundColor: `color-mix(in srgb, ${color} 14%, var(--surface))`, color }
                        }
                      >
                        {markText(c) || <Building2 className="w-[18px] h-[18px]" />}
                      </span>
                      <span className="min-w-0 flex-1 border-b border-line/70 pb-2.5 -mb-2.5">
                        <span className={cn('block truncate text-[15px] font-semibold', selected ? 'text-brand-text' : 'text-fg')}>
                          {c.name}
                        </span>
                        <span className="flex items-center gap-1.5 mt-0.5 text-xs font-medium text-fg-subtle min-w-0">
                          {c.city && (
                            <>
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{c.city}</span>
                              <span aria-hidden>·</span>
                            </>
                          )}
                          <span className="shrink-0">
                            {groups} {groups === 1 ? 'grupo' : 'grupos'}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </nav>
            <div className="shrink-0 border-t border-line">{joinForm(true)}</div>
          </aside>

          <div className="min-w-0 lg:pl-4 lg:pt-3 lg:pb-8">
            {detail ?? (
              <EmptyState
                icon={MousePointerClick}
                title="Selecione uma igreja"
                description="Escolha uma igreja na lista para ver eventos, grupos e equipe."
              />
            )}
          </div>
        </div>
      ) : (
        <>
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

          {joinForm(false)}
        </>
      )}
    </PageShell>
  );
};
