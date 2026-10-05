import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Edit3,
  LayoutList,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import type { ChurchEvent, MusicGroup } from '../types';
import { EVENT_TITLE_SUGGESTIONS } from '../constants/eventTitles';
import { PageHeader } from './PageHeader';
import { EventCard } from './EventCard';
import { Button, EmptyState, Fab, IconButton, Modal, Tabs, cn } from './ui';
import { formatDateLong } from '@/utils/dateLabels';
import { useConfirm } from '@/contexts/ConfirmProvider';

type DisplayMode = 'calendar' | 'month' | 'week' | 'agenda';

const DISPLAY_MODE_STORAGE_KEY = 'louvorhub_events_display_mode_v2';
const DISPLAY_MODES: DisplayMode[] = ['calendar', 'month', 'week', 'agenda'];

function readStoredDisplayMode(): DisplayMode {
  try {
    const raw = localStorage.getItem(DISPLAY_MODE_STORAGE_KEY);
    if (raw && DISPLAY_MODES.includes(raw as DisplayMode)) return raw as DisplayMode;
  } catch {
    /* ignore */
  }
  return 'agenda';
}

function toDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function parseDateStr(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00`);
}

/** Início da semana (domingo), alinhado ao calendário. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addDaysToDateStr(dateStr: string, days: number): string {
  return toDateStr(addDays(parseDateStr(dateStr), days));
}

function buildOccurrenceDates(startDate: string, count: number, intervalDays: number): string[] {
  const safeCount = Math.min(52, Math.max(1, Math.floor(count)));
  const safeInterval = Math.min(365, Math.max(1, Math.floor(intervalDays)));
  return Array.from({ length: safeCount }, (_, i) =>
    addDaysToDateStr(startDate, i * safeInterval),
  );
}

interface EventManagerProps {
  events: ChurchEvent[];
  musicGroups: MusicGroup[];
  activeChurchId: string;
  /** Dentro do workspace: oculta o PageHeader (já há título Workspace + abas). */
  embedded?: boolean;
  onSaveEvent: (event: ChurchEvent) => void | Promise<void>;
  onSaveEventBatch?: (
    event: ChurchEvent,
    count: number,
    intervalDays: number,
  ) => void | Promise<void>;
  onDeleteEvent: (id: string) => void | Promise<void>;
  onOpenEvent: (eventId: string) => void;
  churchName?: string;
  churchColor?: string | null;
  /** Conteúdo logo abaixo do cabeçalho (ex.: filtro por igreja). */
  toolbar?: React.ReactNode;
}

export const EventManager: React.FC<EventManagerProps> = ({
  events,
  musicGroups,
  activeChurchId,
  embedded = false,
  onSaveEvent,
  onSaveEventBatch,
  onDeleteEvent,
  onOpenEvent,
  churchName,
  churchColor,
  toolbar,
}) => {
  const confirm = useConfirm();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(readStoredDisplayMode);
  const [listScope, setListScope] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    try {
      localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, displayMode);
    } catch {
      /* ignore */
    }
  }, [displayMode]);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [weekCursor, setWeekCursor] = useState(() => startOfWeek(new Date()));
  const todayStr = toDateStr(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(todayStr);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChurchEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('Culto');
  const [formDate, setFormDate] = useState(todayStr);
  const [formTime, setFormTime] = useState('19:00');
  const [formTheme, setFormTheme] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formRepeatEnabled, setFormRepeatEnabled] = useState(false);
  const [formRepeatCount, setFormRepeatCount] = useState(4);
  const [formRepeatIntervalDays, setFormRepeatIntervalDays] = useState(7);

  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''),
      ),
    [events],
  );

  const upcomingEvents = sortedEvents.filter((e) => e.date >= todayStr);
  const pastEvents = useMemo(
    () => sortedEvents.filter((e) => e.date < todayStr).reverse(),
    [sortedEvents, todayStr],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ChurchEvent[]>();
    for (const e of sortedEvents) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [sortedEvents]);

  const calendarCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const gridStart = new Date(year, month, 1 - startOffset);
    const cells: { dateStr: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addDays(gridStart, i);
      cells.push({
        dateStr: toDateStr(d),
        day: d.getDate(),
        inMonth: d.getMonth() === month,
      });
    }
    return cells;
  }, [calendarCursor]);

  const monthLabel = calendarCursor.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const monthPrefix = `${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth() + 1).padStart(2, '0')}`;
  const monthEvents = useMemo(
    () => sortedEvents.filter((e) => e.date.startsWith(monthPrefix)),
    [sortedEvents, monthPrefix],
  );

  const weekStart = weekCursor;
  const weekEnd = addDays(weekStart, 6);
  const weekStartStr = toDateStr(weekStart);
  const weekEndStr = toDateStr(weekEnd);
  const weekLabel = `${weekStart.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  })} – ${weekEnd.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })}`;
  const weekEvents = useMemo(
    () => sortedEvents.filter((e) => e.date >= weekStartStr && e.date <= weekEndStr),
    [sortedEvents, weekStartStr, weekEndStr],
  );

  const calendarDayEvents = selectedDay
    ? sortedEvents.filter((e) => e.date === selectedDay)
    : [];

  const agendaEvents = listScope === 'upcoming' ? upcomingEvents : pastEvents;

  const eventsToShow =
    displayMode === 'calendar'
      ? calendarDayEvents
      : displayMode === 'month'
        ? monthEvents
        : displayMode === 'week'
          ? weekEvents
          : agendaEvents;

  const recurrencePreview = useMemo(() => {
    if (!formDate || !formRepeatEnabled || editing) return [];
    return buildOccurrenceDates(formDate, formRepeatCount, formRepeatIntervalDays);
  }, [formDate, formRepeatEnabled, formRepeatCount, formRepeatIntervalDays, editing]);

  const openNew = (prefillDate?: string) => {
    setEditing(null);
    setFormTitle('Culto');
    setFormDate(prefillDate || selectedDay || todayStr);
    setFormTime('19:00');
    setFormTheme('');
    setFormNotes('');
    setFormGroupId(musicGroups[0]?.id || '');
    setFormRepeatEnabled(false);
    setFormRepeatCount(4);
    setFormRepeatIntervalDays(7);
    setIsModalOpen(true);
  };

  const openEdit = (ev: ChurchEvent) => {
    setEditing(ev);
    setFormTitle(ev.title);
    setFormDate(ev.date);
    setFormTime(ev.time || '19:00');
    setFormTheme(ev.theme || '');
    setFormNotes(ev.notes || '');
    setFormGroupId(ev.musicGroupId || '');
    setFormRepeatEnabled(false);
    setIsModalOpen(true);
  };

  const goToToday = () => {
    const now = new Date();
    setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1));
    setWeekCursor(startOfWeek(now));
    setSelectedDay(todayStr);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || isSaving) return;

    const title = formTitle.trim() || 'Culto';
    const base: ChurchEvent = {
      id: editing?.id || '',
      churchId: activeChurchId,
      title,
      date: formDate,
      time: formTime,
      serviceType: title,
      theme: formTheme || undefined,
      notes: formNotes || undefined,
      musicGroupId: formGroupId || undefined,
      createdAt: editing?.createdAt || new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      if (!editing && formRepeatEnabled && formRepeatCount > 1 && onSaveEventBatch) {
        await onSaveEventBatch(base, formRepeatCount, formRepeatIntervalDays);
      } else {
        await onSaveEvent(base);
      }
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const modeButtons: {
    id: DisplayMode;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'agenda', label: 'Lista', icon: LayoutList },
    { id: 'calendar', label: 'Calendário', icon: CalendarDays },
    { id: 'month', label: 'Mês', icon: Calendar },
    { id: 'week', label: 'Semana', icon: CalendarRange },
  ];

  const emptyMessage =
    displayMode === 'calendar'
      ? 'Nenhum evento neste dia'
      : displayMode === 'month'
        ? 'Nenhum evento neste mês'
        : displayMode === 'week'
          ? 'Nenhum evento nesta semana'
          : listScope === 'upcoming'
            ? 'Nenhum evento próximo'
            : 'Nenhum evento anterior';

  const askDelete = (ev: ChurchEvent) => {
    void confirm({
      title: 'Excluir evento',
      message: `"${ev.title}" será removido junto com a escala, a liturgia e o repertório vinculados.`,
      confirmLabel: 'Excluir evento',
    }).then((ok) => {
      if (ok) onDeleteEvent(ev.id);
    });
  };

  const renderEventCard = (ev: ChurchEvent) => (
    <EventCard
      key={ev.id}
      event={ev}
      churchName={churchName}
      churchColor={churchColor}
      groupName={musicGroups.find((g) => g.id === ev.musicGroupId)?.name}
      onOpen={() => onOpenEvent(ev.id)}
      actions={
        <>
          <IconButton icon={Edit3} label="Editar evento" variant="ghost" size="sm" onClick={() => openEdit(ev)} />
          <IconButton
            icon={Trash2}
            label="Excluir evento"
            variant="ghost"
            size="sm"
            onClick={() => askDelete(ev)}
            className="hover:!text-danger-text hover:!bg-danger-soft"
          />
        </>
      }
    />
  );

  const groupedByDate = useMemo(() => {
    const groups: { date: string; items: ChurchEvent[] }[] = [];
    for (const ev of eventsToShow) {
      const last = groups[groups.length - 1];
      if (last && last.date === ev.date) last.items.push(ev);
      else groups.push({ date: ev.date, items: [ev] });
    }
    return groups;
  }, [eventsToShow]);

  const renderPeriodNav = (opts: {
    label: string;
    onPrev: () => void;
    onNext: () => void;
    prevLabel: string;
    nextLabel: string;
  }) => (
    <div className="flex items-center justify-between gap-3 mb-4">
      <IconButton icon={ChevronLeft} label={opts.prevLabel} variant="ghost" onClick={opts.onPrev} />
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-bold text-fg capitalize">{opts.label}</h3>
        <button
          type="button"
          onClick={goToToday}
          className="text-xs text-brand-text hover:underline font-semibold"
        >
          Ir para hoje
        </button>
      </div>
      <IconButton icon={ChevronRight} label={opts.nextLabel} variant="ghost" onClick={opts.onNext} />
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {!embedded && (
        <PageHeader
          title="Agenda"
          description={churchName ? `Eventos, escalas e liturgias · ${churchName}` : 'Eventos, escalas e liturgias'}
        />
      )}

      {toolbar}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        {displayMode === 'agenda' ? (
          <Tabs
            ariaLabel="Período"
            value={listScope}
            onChange={setListScope}
            className="sm:w-80"
            tabs={[
              { id: 'upcoming', label: 'Próximos', count: upcomingEvents.length },
              { id: 'past', label: 'Anteriores', count: pastEvents.length },
            ]}
          />
        ) : (
          <p className="text-sm font-semibold text-fg-muted">
            {eventsToShow.length} evento{eventsToShow.length === 1 ? '' : 's'}
            {displayMode === 'calendar' ? ' no dia' : ' no período'}
          </p>
        )}
        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <div className="flex items-center gap-0.5 p-1 rounded-[14px] bg-surface-2" role="group" aria-label="Modo de exibição">
            {modeButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDisplayMode(id)}
                title={label}
                aria-pressed={displayMode === id}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 min-h-9 !rounded-[10px] text-xs font-semibold transition-all whitespace-nowrap',
                  displayMode === id ? 'bg-surface text-brand-text shadow-card' : 'text-fg-muted hover:text-fg',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            ))}
          </div>
          {embedded && (
            <Button size="sm" icon={Plus} onClick={() => openNew()}>
              Novo
            </Button>
          )}
        </div>
      </div>

      {displayMode === 'calendar' && (
        <div className="ui-card p-3 sm:p-5">
          {renderPeriodNav({
            label: monthLabel,
            onPrev: () =>
              setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)),
            onNext: () =>
              setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)),
            prevLabel: 'Mês anterior',
            nextLabel: 'Próximo mês',
          })}

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-stone-500 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarCells.map((cell) => {
              const dayEvents = eventsByDate.get(cell.dateStr) || [];
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDay;
              return (
                <div
                  key={cell.dateStr}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedDay(cell.dateStr);
                    if (!cell.inMonth) {
                      setCalendarCursor(
                        new Date(
                          Number(cell.dateStr.slice(0, 4)),
                          Number(cell.dateStr.slice(5, 7)) - 1,
                          1,
                        ),
                      );
                    }
                  }}
                  onDoubleClick={() => {
                    setSelectedDay(cell.dateStr);
                    if (dayEvents.length === 0) openNew(cell.dateStr);
                    else if (dayEvents.length === 1) onOpenEvent(dayEvents[0].id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedDay(cell.dateStr);
                    }
                  }}
                  className={`min-h-[2.75rem] sm:min-h-[3.75rem] rounded-xl border p-1 sm:p-1.5 text-left transition-all flex flex-col gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : isToday
                        ? 'border-emerald-700/70 bg-stone-950'
                        : 'border-stone-800 bg-stone-950/40 hover:border-stone-700'
                  } ${cell.inMonth ? '' : 'opacity-40'}`}
                >
                  <span
                    className={`inline-flex w-5 h-5 sm:w-6 sm:h-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-bold ${
                      isToday ? 'bg-emerald-500 text-stone-950' : 'text-stone-300'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden min-h-0">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEvent(ev.id);
                        }}
                        className="block w-full truncate rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold border text-left bg-stone-800 text-stone-200 border-stone-700"
                        title={ev.title}
                      >
                        <span className="font-mono">{ev.time || '—'}</span>
                        <span className="hidden sm:inline"> · {ev.title}</span>
                      </button>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="block text-[9px] text-stone-500 font-mono px-0.5">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 border-t border-stone-800 pt-3">
            <p className="text-xs text-stone-400 shrink-0">
              {selectedDay
                ? `Dia ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}`
                : 'Selecione um dia'}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 sm:justify-end min-w-0">
              <label className="sr-only" htmlFor="upcoming-events-combo">
                Próximos eventos
              </label>
              <select
                id="upcoming-events-combo"
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const ev = upcomingEvents.find((item) => item.id === id);
                  if (!ev) return;
                  setSelectedDay(ev.date);
                  setCalendarCursor(
                    new Date(Number(ev.date.slice(0, 4)), Number(ev.date.slice(5, 7)) - 1, 1),
                  );
                  onOpenEvent(ev.id);
                }}
                className="w-full sm:max-w-xs bg-stone-950 border border-stone-700 text-stone-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600 truncate"
              >
                <option value="">
                  {upcomingEvents.length === 0
                    ? 'Nenhum próximo evento'
                    : `Próximos eventos (${upcomingEvents.length})`}
                </option>
                {upcomingEvents.map((ev) => {
                  const dateLabel = new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  });
                  return (
                    <option key={ev.id} value={ev.id}>
                      {dateLabel}
                      {ev.time ? ` · ${ev.time}` : ''} · {ev.title}
                    </option>
                  );
                })}
              </select>
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => openNew(selectedDay)}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs whitespace-nowrap"
                >
                  + Evento neste dia
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {(displayMode === 'month' || displayMode === 'week') && (
        <div className="ui-card p-4 sm:p-5">
          {displayMode === 'month'
            ? renderPeriodNav({
                label: monthLabel,
                onPrev: () =>
                  setCalendarCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  ),
                onNext: () =>
                  setCalendarCursor(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  ),
                prevLabel: 'Mês anterior',
                nextLabel: 'Próximo mês',
              })
            : renderPeriodNav({
                label: weekLabel,
                onPrev: () => setWeekCursor((prev) => addDays(prev, -7)),
                onNext: () => setWeekCursor((prev) => addDays(prev, 7)),
                prevLabel: 'Semana anterior',
                nextLabel: 'Próxima semana',
              })}
          <p className="text-xs text-fg-subtle text-center -mt-2 mb-1">
            Lista ordenada por data e horário
          </p>
        </div>
      )}

      {eventsToShow.length === 0 ? (
        <EmptyState
          compact={displayMode === 'calendar'}
          icon={Calendar}
          title={emptyMessage}
          description={
            listScope === 'upcoming' || displayMode !== 'agenda'
              ? 'Crie um culto ou ensaio para montar a escala, a liturgia e o repertório.'
              : undefined
          }
          action={
            <Button
              size="sm"
              icon={Plus}
              onClick={() => openNew(displayMode === 'calendar' ? selectedDay || undefined : undefined)}
            >
              Criar evento
            </Button>
          }
        />
      ) : displayMode === 'calendar' ? (
        <div className="space-y-3">{eventsToShow.map((ev) => renderEventCard(ev))}</div>
      ) : (
        <div className="space-y-5">
          {groupedByDate.map(({ date, items }) => (
            <section key={date}>
              <h3 className="text-[13px] font-bold text-fg-muted mb-2 first-letter:uppercase">
                {formatDateLong(date)}
              </h3>
              <div className="space-y-3">{items.map((ev) => renderEventCard(ev))}</div>
            </section>
          ))}
        </div>
      )}

      {!embedded && <Fab icon={Plus} label="Novo evento" onClick={() => openNew()} />}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        locked={isSaving}
        icon={Calendar}
        title={editing ? 'Editar evento' : 'Novo evento'}
        footer={
          <>
            <Button variant="ghost" disabled={isSaving} onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="event-form" loading={isSaving}>
              {!editing && formRepeatEnabled && formRepeatCount > 1
                ? `Criar ${formRepeatCount} eventos`
                : 'Salvar'}
            </Button>
          </>
        }
      >
            <form id="event-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Título</label>
                <input
                  required
                  list="event-title-suggestions"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex.: Culto, Escola Bíblica…"
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100"
                />
                <datalist id="event-title-suggestions">
                  {EVENT_TITLE_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Horário</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Tema</label>
                <input
                  value={formTheme}
                  onChange={(e) => setFormTheme(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Banda / Grupo
                </label>
                <select
                  value={formGroupId}
                  onChange={(e) => setFormGroupId(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                >
                  <option value="">Sem grupo</option>
                  {musicGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Notas</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              {!editing && onSaveEventBatch && (
                <div className="rounded-xl border border-stone-800 bg-stone-950/50 p-3 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formRepeatEnabled}
                      onChange={(e) => setFormRepeatEnabled(e.target.checked)}
                      className="mt-0.5 rounded border-stone-600"
                    />
                    <span>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-stone-200">
                        <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                        Criar em lote
                      </span>
                      <span className="block text-[11px] text-stone-500 mt-0.5">
                        Replica o evento (com equipe e repertório vazios) em várias datas.
                      </span>
                    </span>
                  </label>
                  {formRepeatEnabled && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                            Quantas vezes
                          </label>
                          <input
                            type="number"
                            min={2}
                            max={52}
                            value={formRepeatCount}
                            onChange={(e) =>
                              setFormRepeatCount(
                                Math.min(52, Math.max(2, Number(e.target.value) || 2)),
                              )
                            }
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                            A cada (dias)
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={365}
                            value={formRepeatIntervalDays}
                            onChange={(e) =>
                              setFormRepeatIntervalDays(
                                Math.min(365, Math.max(1, Number(e.target.value) || 1)),
                              )
                            }
                            className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-xs"
                          />
                        </div>
                      </div>
                      {recurrencePreview.length > 0 && (
                        <p className="text-[11px] text-stone-400">
                          <AlertCircle className="w-3 h-3 inline mr-1 text-emerald-400" />
                          {recurrencePreview.length} eventos:{' '}
                          {recurrencePreview
                            .map((d) =>
                              new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              }),
                            )
                            .join(' · ')}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </form>
      </Modal>
    </div>
  );
};
