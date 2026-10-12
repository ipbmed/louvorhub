import React from 'react';
import { BookOpenText, Clock, ListMusic, Users } from 'lucide-react';
import type { ChurchEvent } from '@/types';
import { dayParts, relativeDay } from '@/utils/dateLabels';
import { cn } from './ui/cn';

const DEFAULT_CHURCH_COLOR = '#4f46e5';

interface EventCardProps {
  event: ChurchEvent;
  churchName?: string;
  churchColor?: string | null;
  groupName?: string;
  onOpen: () => void;
  /** Ações extras (editar/excluir) exibidas no canto. */
  actions?: React.ReactNode;
}

const Flag: React.FC<{ on?: boolean; icon: React.ComponentType<{ className?: string }>; label: string }> = ({
  on,
  icon: Icon,
  label,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
      on ? 'bg-brand-soft text-brand-text' : 'bg-surface-2 text-fg-subtle',
    )}
    title={on ? `${label} definido` : `${label} pendente`}
  >
    <Icon className="w-3 h-3" />
    {label}
  </span>
);

/** Cartão de evento com bloco de data na cor da igreja. */
export const EventCard: React.FC<EventCardProps> = ({
  event,
  churchName,
  churchColor,
  groupName,
  onOpen,
  actions,
}) => {
  const color = churchColor || DEFAULT_CHURCH_COLOR;
  const { day, month, weekday } = dayParts(event.date);
  const meta = [churchName, groupName].filter(Boolean).join(' · ');

  return (
    <div className="ui-card group relative flex gap-3.5 p-3.5 hover:-translate-y-0.5 hover:shadow-card-lg transition-all">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 !rounded-2xl z-0"
        aria-label={`Abrir ${event.title}`}
      />
      <div
        className="relative w-[58px] shrink-0 rounded-[14px] flex flex-col items-center justify-center py-2 uppercase pointer-events-none"
        style={{ backgroundColor: `color-mix(in srgb, ${color} 12%, var(--surface))`, color }}
      >
        <span className="text-[10px] font-bold tracking-wide leading-none">{weekday}</span>
        <span className="text-2xl font-extrabold leading-none my-0.5">{day}</span>
        <span className="text-[10px] font-bold tracking-wide leading-none">{month}</span>
      </div>
      <div className="relative min-w-0 flex-1 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-bold text-fg leading-snug truncate">{event.title}</h3>
          <span className="text-xs font-semibold text-fg-subtle whitespace-nowrap shrink-0 mt-0.5">
            {relativeDay(event.date)}
          </span>
        </div>
        <p className="text-[13px] text-fg-muted mt-0.5 flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="shrink-0">{event.time ? event.time.slice(0, 5) : 'Horário a definir'}</span>
          {meta && <span className="truncate">· {meta}</span>}
        </p>
        {event.theme && <p className="text-xs text-fg-subtle mt-0.5 truncate">Tema: {event.theme}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Flag on={event.hasSchedule} icon={Users} label="Equipe" />
          <Flag on={event.hasLiturgy} icon={BookOpenText} label="Liturgia" />
          <Flag on={event.hasRepertoire ?? event.hasSetlist} icon={ListMusic} label="Repertório" />
        </div>
      </div>
      {actions && (
        <div className="relative z-10 flex flex-col items-center gap-1 shrink-0 -my-1 -mr-1">{actions}</div>
      )}
    </div>
  );
};
