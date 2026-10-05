import React, { useMemo } from 'react';
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Church,
  ListMusic,
  Music2,
  Search,
  UsersRound,
} from 'lucide-react';
import type { ChurchEvent, MusicGroup, Setlist, ViewMode } from '@/types';
import { greeting, todayStr } from '@/utils/dateLabels';
import { EventCard } from './EventCard';
import { Button, EmptyState, SectionTitle, StatCard } from './ui';

interface HomeDashboardProps {
  userName: string;
  churchName?: string;
  churchColor?: string | null;
  canAccessEvents: boolean;
  events: ChurchEvent[];
  musicGroups: MusicGroup[];
  setlists: Setlist[];
  songsCount: number;
  churchesCount: number;
  onNavigate: (view: ViewMode) => void;
  onOpenEvent: (eventId: string) => void;
}

const LinkButton: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-0.5 text-sm font-semibold text-brand-text hover:underline"
  >
    {children}
    <ChevronRight className="w-4 h-4" />
  </button>
);

/** Início do ambiente privado: saudação, números e próximos eventos. */
export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  userName,
  churchName,
  churchColor,
  canAccessEvents,
  events,
  musicGroups,
  setlists,
  songsCount,
  churchesCount,
  onNavigate,
  onOpenEvent,
}) => {
  const firstName = userName.trim().split(/\s+/)[0] || userName;

  const upcoming = useMemo(() => {
    const today = todayStr();
    return events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
  }, [events]);

  const recentSetlists = useMemo(
    () =>
      [...setlists]
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 3),
    [setlists],
  );

  const groupName = (id?: string) => musicGroups.find((g) => g.id === id)?.name;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-[26px] font-extrabold text-fg tracking-tight leading-tight">
          {greeting()}, {firstName}!
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          {churchName ? (
            <>
              Veja o que vem por aí em <b className="text-fg font-semibold">{churchName}</b>.
            </>
          ) : (
            'Que bom ter você por aqui.'
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 xs:grid-cols-4 gap-3">
        {canAccessEvents && (
          <StatCard
            icon={CalendarDays}
            value={upcoming.length}
            label="Próximos eventos"
            color="#4f46e5"
            onClick={() => onNavigate('events')}
          />
        )}
        <StatCard icon={Music2} value={songsCount} label="Músicas" color="#db2777" onClick={() => onNavigate('public')} />
        <StatCard
          icon={ListMusic}
          value={setlists.length}
          label="Playlists"
          color="#0d9488"
          onClick={() => onNavigate('setlist')}
        />
        <StatCard
          icon={Church}
          value={churchesCount}
          label={churchesCount === 1 ? 'Igreja' : 'Igrejas'}
          color="#ea580c"
          onClick={() => onNavigate('churchList')}
        />
        {!canAccessEvents && (
          <StatCard
            icon={UsersRound}
            value={musicGroups.length}
            label="Grupos"
            color="#7c3aed"
            onClick={() => onNavigate('churchList')}
          />
        )}
      </div>

      <button
        type="button"
        onClick={() => onNavigate('public')}
        className="w-full ui-card !rounded-2xl flex items-center gap-3 px-4 min-h-[52px] text-left text-fg-subtle hover:text-fg-muted transition-colors"
      >
        <Search className="w-5 h-5 shrink-0" />
        <span className="text-[15px]">Buscar hino ou cântico por nome, número ou letra…</span>
      </button>

      {canAccessEvents && (
        <section>
          <SectionTitle
            icon={CalendarDays}
            title="Próximos eventos"
            action={upcoming.length > 0 ? <LinkButton onClick={() => onNavigate('events')}>Ver agenda</LinkButton> : undefined}
          />
          {upcoming.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarPlus}
              title="Nenhum evento próximo"
              description="Crie um culto ou ensaio para montar a escala, a liturgia e o repertório."
              action={
                <Button size="sm" icon={CalendarPlus} onClick={() => onNavigate('events')}>
                  Ir para a agenda
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 4).map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  churchName={churchName}
                  churchColor={churchColor}
                  groupName={groupName(ev.musicGroupId)}
                  onOpen={() => onOpenEvent(ev.id)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionTitle
          icon={ListMusic}
          title="Minhas playlists"
          action={<LinkButton onClick={() => onNavigate('setlist')}>Ver todas</LinkButton>}
        />
        {recentSetlists.length === 0 ? (
          <EmptyState
            compact
            icon={ListMusic}
            title="Nenhuma playlist ainda"
            description="Monte listas de músicas para ensaios, cultos ou estudo pessoal."
            action={
              <Button size="sm" variant="secondary" icon={ListMusic} onClick={() => onNavigate('setlist')}>
                Criar playlist
              </Button>
            }
          />
        ) : (
          <div className="ui-card overflow-hidden divide-y divide-line">
            {recentSetlists.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onNavigate('setlist')}
                className="w-full flex items-center gap-3 px-4 py-3 text-left !rounded-none hover:bg-surface-2 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,#0d9488_12%,transparent)] text-[#0d9488] flex items-center justify-center shrink-0">
                  <ListMusic className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-fg truncate">{s.title}</span>
                  <span className="block text-xs text-fg-muted">
                    {s.items.length} {s.items.length === 1 ? 'música' : 'músicas'}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
