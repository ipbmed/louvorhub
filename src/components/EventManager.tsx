import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  LayoutList,
  Plus,
  Repeat,
  Trash2,
  Users,
} from 'lucide-react';
import type { ChurchEvent, MusicGroup } from '../types';
import { EVENT_TITLE_SUGGESTIONS } from '../constants/eventTitles';
import { PageHeader, PageHeaderButton } from './PageHeader';

type DisplayMode = 'calendar' | 'month' | 'week' | 'agenda';

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
  onSaveEvent: (event: ChurchEvent) => void | Promise<void>;
  onSaveEventBatch?: (
    event: ChurchEvent,
    count: number,
    intervalDays: number,
  ) => void | Promise<void>;
  onDeleteEvent: (id: string) => void | Promise<void>;
  onOpenEvent: (eventId: string) => void;
}

export const EventManager: React.FC<EventManagerProps> = ({
  events,
  musicGroups,
  activeChurchId,
  onSaveEvent,
  onSaveEventBatch,
  onDeleteEvent,
  onOpenEvent,
}) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('calendar');
  const [listScope, setListScope] = useState<'agenda' | 'all'>('agenda');
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

  const agendaEvents = listScope === 'agenda' ? upcomingEvents : sortedEvents;

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

  const modeButtons: { id: DisplayMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'calendar', label: 'Calendário', icon: CalendarDays },
    { id: 'month', label: 'Mensal', icon: Calendar },
    { id: 'week', label: 'Semana', icon: CalendarRange },
    { id: 'agenda', label: 'Programação', icon: LayoutList },
  ];

  const emptyMessage =
    displayMode === 'calendar'
      ? 'Nenhum evento neste dia'
      : displayMode === 'month'
        ? 'Nenhum evento neste mês'
        : displayMode === 'week'
          ? 'Nenhum evento nesta semana'
          : listScope === 'agenda'
            ? 'Nenhum evento próximo'
            : 'Nenhum evento cadastrado';

  const renderEventCard = (ev: ChurchEvent) => {
    const group = musicGroups.find((g) => g.id === ev.musicGroupId);
    return (
      <div
        key={ev.id}
        className="bg-stone-900 border border-stone-800 rounded-2xl p-5 hover:border-stone-700 transition-all"
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              {new Date(ev.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
              {ev.time ? ` · ${ev.time}` : ''}
            </p>
            <button
              type="button"
              onClick={() => onOpenEvent(ev.id)}
              className="text-left text-lg font-display font-bold text-stone-100 mt-0.5 hover:text-emerald-300 transition-colors"
            >
              {ev.title}
            </button>
            {ev.theme && <p className="text-xs text-stone-400 mt-1">Tema: {ev.theme}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onOpenEvent(ev.id)}
              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
              title="Abrir evento"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir
            </button>
            <button
              type="button"
              onClick={() => openEdit(ev)}
              className="p-1.5 text-stone-400 hover:text-emerald-300 rounded-button border border-transparent hover:border-stone-700"
              title="Editar"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm('Excluir este evento e a escala vinculada?')) {
                  onDeleteEvent(ev.id);
                }
              }}
              className="p-1.5 text-stone-500 hover:text-rose-400 rounded-button"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] font-semibold">
          <span
            className={`px-2 py-0.5 rounded border ${
              ev.hasSchedule
                ? 'border-emerald-800/60 text-emerald-300 bg-emerald-950/40'
                : 'border-stone-700 text-stone-500'
            }`}
          >
            <Users className="w-3 h-3 inline mr-1" />
            Equipe
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              ev.hasLiturgy
                ? 'border-emerald-800/60 text-emerald-300 bg-emerald-950/40'
                : 'border-stone-700 text-stone-500'
            }`}
          >
            Liturgia
          </span>
          <span
            className={`px-2 py-0.5 rounded border ${
              ev.hasSetlist
                ? 'border-emerald-800/60 text-emerald-300 bg-emerald-950/40'
                : 'border-stone-700 text-stone-500'
            }`}
          >
            Repertório
          </span>
          {group && (
            <span className="px-2 py-0.5 rounded border border-stone-700 text-stone-400">
              {group.name}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderPeriodNav = (opts: {
    label: string;
    onPrev: () => void;
    onNext: () => void;
    prevLabel: string;
    nextLabel: string;
  }) => (
    <div className="flex items-center justify-between gap-3 mb-4">
      <button
        type="button"
        onClick={opts.onPrev}
        className="p-2 rounded-button border border-stone-800 text-stone-300 hover:bg-stone-800"
        aria-label={opts.prevLabel}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="text-center">
        <h3 className="text-base sm:text-lg font-display font-bold text-stone-100 capitalize">
          {opts.label}
        </h3>
        <button
          type="button"
          onClick={goToToday}
          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
        >
          Ir para hoje
        </button>
      </div>
      <button
        type="button"
        onClick={opts.onNext}
        className="p-2 rounded-button border border-stone-800 text-stone-300 hover:bg-stone-800"
        aria-label={opts.nextLabel}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-6">
        <PageHeader
          icon={Calendar}
          title="Eventos"
          description="Calendário de cultos e eventos. Abra um evento para equipe de louvor, liturgia e repertório."
          actions={
            <PageHeaderButton icon={Plus} onClick={() => openNew()}>
              Adicionar
            </PageHeaderButton>
          }
        />
      </div>

      <div className="flex flex-col gap-4 bg-stone-900/80 border border-stone-800 p-4 rounded-2xl mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center bg-stone-950 border border-stone-800 p-1 rounded-xl overflow-x-auto">
            {modeButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDisplayMode(id)}
                className={`px-3 sm:px-4 py-2 rounded-button text-xs font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${
                  displayMode === id
                    ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-500/20'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-stone-500 font-mono shrink-0">
            {eventsToShow.length} evento{eventsToShow.length === 1 ? '' : 's'}
            {displayMode === 'month' || displayMode === 'week' || displayMode === 'calendar'
              ? ' neste período'
              : listScope === 'agenda'
                ? ' próximos'
                : ' no total'}
          </span>
        </div>

        {displayMode === 'agenda' && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setListScope('agenda')}
              className={`px-3 py-1.5 rounded-button text-[11px] font-bold border transition-all ${
                listScope === 'agenda'
                  ? 'bg-stone-800 text-emerald-300 border-emerald-800/60'
                  : 'bg-transparent text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              Próximos ({upcomingEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setListScope('all')}
              className={`px-3 py-1.5 rounded-button text-[11px] font-bold border transition-all ${
                listScope === 'all'
                  ? 'bg-stone-800 text-emerald-300 border-emerald-800/60'
                  : 'bg-transparent text-stone-400 border-stone-800 hover:text-stone-200'
              }`}
            >
              Todos ({sortedEvents.length})
            </button>
          </div>
        )}
      </div>

      {displayMode === 'calendar' && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 mb-6">
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
                  className={`min-h-[4.5rem] sm:min-h-[6.5rem] rounded-xl border p-1.5 sm:p-2 text-left transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40'
                      : isToday
                        ? 'border-emerald-700/70 bg-stone-950'
                        : 'border-stone-800 bg-stone-950/40 hover:border-stone-700'
                  } ${cell.inMonth ? '' : 'opacity-40'}`}
                >
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? 'bg-emerald-500 text-stone-950' : 'text-stone-300'
                    }`}
                  >
                    {cell.day}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayEvents.slice(0, 3).map((ev) => (
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
                    {dayEvents.length > 3 && (
                      <span className="block text-[9px] text-stone-500 font-mono px-0.5">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-stone-800 pt-3">
            <p className="text-xs text-stone-400">
              {selectedDay
                ? `Dia ${new Date(selectedDay + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}`
                : 'Selecione um dia'}
            </p>
            {selectedDay && (
              <button
                type="button"
                onClick={() => openNew(selectedDay)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
              >
                + Evento neste dia
              </button>
            )}
          </div>
        </div>
      )}

      {(displayMode === 'month' || displayMode === 'week') && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 mb-6">
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
          <p className="text-xs text-stone-500 text-center -mt-2 mb-1">
            Lista ordenada por data e horário
          </p>
        </div>
      )}

      {eventsToShow.length === 0 ? (
        <div className="text-center py-12 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
          <Calendar className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-300">{emptyMessage}</h3>
          <button
            type="button"
            onClick={() =>
              openNew(displayMode === 'calendar' ? selectedDay || undefined : undefined)
            }
            className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
          >
            + Criar evento
          </button>
        </div>
      ) : displayMode === 'month' || displayMode === 'week' || displayMode === 'agenda' ? (
        <div className="space-y-3">
          {eventsToShow.map((ev) => renderEventCard(ev))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {eventsToShow.map((ev) => renderEventCard(ev))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-display font-bold text-stone-100">
                {editing ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto flex-1">
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

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-800">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs"
                >
                  {isSaving
                    ? 'Salvando...'
                    : !editing && formRepeatEnabled && formRepeatCount > 1
                      ? `Criar ${formRepeatCount} eventos`
                      : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
