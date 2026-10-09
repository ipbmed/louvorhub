import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Clock,
  LayoutList,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react';
import type { ChurchEvent, MusicGroup } from '../types';
import { EVENT_TITLE_SUGGESTIONS } from '../constants/eventTitles';
import { PageHeaderButton, PageShell } from './PageHeader';
import { EventCard } from './EventCard';
import { Button, EmptyState, IconButton, Modal, Tabs, cn } from './ui';
import { formatDateLong, relativeDay } from '@/utils/dateLabels';
import { useConfirm } from '@/contexts/ConfirmProvider';

/** Botão "Criar" com menu (evento único ou vários). O menu vai para um portal porque o cabeçalho recorta o conteúdo com clip-path. */
const CreateEventMenu: React.FC<{ onSingle: () => void; onBatch?: () => void }> = ({
  onSingle,
  onBatch,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!onBatch) {
    return (
      <PageHeaderButton icon={Plus} onClick={onSingle}>
        Criar
      </PageHeaderButton>
    );
  }

  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 6, right: Math.max(8, document.documentElement.clientWidth - rect.right) });
    setOpen((v) => !v);
  };

  const pick = (action: () => void) => {
    setOpen(false);
    action();
  };

  const items = [
    { icon: CalendarPlus, label: 'Um evento', description: 'Culto, ensaio ou reunião', onClick: onSingle },
    { icon: Repeat, label: 'Vários eventos', description: 'Repetir em várias datas', onClick: onBatch },
  ];

  return (
    <>
      <PageHeaderButton icon={Plus} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
        Criar
      </PageHeaderButton>
      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="menu"
              style={{ top: pos.top, right: pos.right }}
              className="fixed z-[71] w-64 rounded-2xl border border-line bg-surface shadow-card-lg p-1.5 animate-in fade-in duration-150"
            >
              {items.map(({ icon: Icon, label, description, onClick }) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  onClick={() => pick(onClick)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 !rounded-xl text-left hover:bg-surface-2 transition-colors"
                >
                  <Icon className="w-5 h-5 text-fg-muted shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-fg">{label}</span>
                    <span className="block text-[11px] text-fg-muted">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

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

const PANEL_COLLAPSED_KEY = 'louvorhub_agenda_panel_collapsed';

function readCollapsedSections(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(PANEL_COLLAPSED_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
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
  /** Dentro do workspace: oculta o cabeçalho (já há título Workspace + abas). */
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
  /** Igrejas do usuário; com mais de uma, o painel lateral mostra a lista para exibir/ocultar. */
  churches?: AgendaChurch[];
  visibleChurchIds?: string[];
  onToggleChurch?: (churchId: string) => void;
  onShowOnlyChurch?: (churchId: string) => void;
}

export interface AgendaChurch {
  id: string;
  name: string;
  sigla?: string | null;
  color?: string | null;
}

const DEFAULT_CHURCH_COLOR = '#4f46e5';

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
  churches = [],
  visibleChurchIds,
  onToggleChurch,
  onShowOnlyChurch,
}) => {
  const churchById = useMemo(() => new Map(churches.map((c) => [c.id, c])), [churches]);
  const colorOf = (churchId: string) =>
    churchById.get(churchId)?.color || (churchId === activeChurchId ? churchColor : null) || DEFAULT_CHURCH_COLOR;
  const multiChurch = churches.length > 1;
  const churchLabel = (churchId: string) => {
    const church = churchById.get(churchId);
    return church?.sigla?.trim() || church?.name || '';
  };
  const confirm = useConfirm();
  const [displayMode, setDisplayMode] = useState<DisplayMode>(readStoredDisplayMode);
  const [collapsedSections, setCollapsedSections] = useState<string[]>(readCollapsedSections);
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

  const [formChurchId, setFormChurchId] = useState(activeChurchId);
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

  const groupsOf = (churchId: string) => musicGroups.filter((g) => g.churchId === churchId);

  const openNew = (prefillDate?: string, repeat = false) => {
    const churchId =
      !visibleChurchIds || visibleChurchIds.includes(activeChurchId)
        ? activeChurchId
        : visibleChurchIds[0] || activeChurchId;
    setEditing(null);
    setFormChurchId(churchId);
    setFormTitle('Culto');
    setFormDate(prefillDate || selectedDay || todayStr);
    setFormTime('19:00');
    setFormTheme('');
    setFormNotes('');
    setFormGroupId(groupsOf(churchId)[0]?.id || '');
    setFormRepeatEnabled(repeat);
    setFormRepeatCount(4);
    setFormRepeatIntervalDays(7);
    setIsModalOpen(true);
  };

  const openEdit = (ev: ChurchEvent) => {
    setEditing(ev);
    setFormChurchId(ev.churchId);
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
      churchId: formChurchId,
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
      churchName={churchById.get(ev.churchId)?.name || churchName}
      churchColor={colorOf(ev.churchId)}
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
        <h3 className="text-base sm:text-lg font-bold text-fg first-letter:uppercase">{opts.label}</h3>
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

  const nextEvent = upcomingEvents[0];
  const weekLimitStr = addDaysToDateStr(todayStr, 6);
  const pendingLimitStr = addDaysToDateStr(todayStr, 30);
  const thisWeekCount = upcomingEvents.filter((e) => e.date <= weekLimitStr).length;
  const thisMonthCount = sortedEvents.filter((e) => e.date.startsWith(todayStr.slice(0, 7))).length;
  const missingParts = (ev: ChurchEvent) =>
    [
      !ev.hasSchedule && 'equipe',
      !ev.hasLiturgy && 'liturgia',
      !(ev.hasRepertoire ?? ev.hasSetlist) && 'repertório',
    ].filter((p): p is string => Boolean(p));
  const pendingEvents = upcomingEvents.filter(
    (e) => e.date <= pendingLimitStr && missingParts(e).length > 0,
  );

  const isSectionOpen = (id: string) => !collapsedSections.includes(id);
  const toggleSection = (id: string) => {
    const next = isSectionOpen(id)
      ? [...collapsedSections, id]
      : collapsedSections.filter((s) => s !== id);
    setCollapsedSections(next);
    try {
      localStorage.setItem(PANEL_COLLAPSED_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const renderSectionHeader = (id: string, title: string, meta?: React.ReactNode) => {
    const open = isSectionOpen(id);
    return (
      <button
        type="button"
        onClick={() => toggleSection(id)}
        aria-expanded={open}
        title={open ? 'Minimizar' : 'Expandir'}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-1.5 py-1 !rounded-lg hover:bg-surface-2 transition-colors',
          open && 'mb-1',
        )}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-fg-subtle">{title}</span>
        <span className="flex items-center gap-1.5 text-[11px] text-fg-subtle">
          {meta}
          <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', open && 'rotate-180')} />
        </span>
      </button>
    );
  };

  const pickDay = (dateStr: string) => {
    setSelectedDay(dateStr);
    setCalendarCursor(new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1, 1));
    setDisplayMode('calendar');
  };

  const createMenu = (
    <CreateEventMenu
      onSingle={() => openNew()}
      onBatch={onSaveEventBatch ? () => openNew(undefined, true) : undefined}
    />
  );

  const sidePanel = (
    <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto bg-surface border-r border-line divide-y divide-line [scrollbar-width:thin]">
      <section className="px-3 py-4">
        <div className="flex items-center justify-between gap-1 mb-2">
          <IconButton
            icon={ChevronLeft}
            label="Mês anterior"
            variant="ghost"
            size="sm"
            onClick={() => setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          />
          <button
            type="button"
            onClick={goToToday}
            title="Ir para hoje"
            className="text-[13px] font-bold text-fg first-letter:uppercase hover:text-brand-text transition-colors"
          >
            {monthLabel}
          </button>
          <IconButton
            icon={ChevronRight}
            label="Próximo mês"
            variant="ghost"
            size="sm"
            onClick={() => setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          />
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-fg-subtle mb-1">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {calendarCells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
            const count = dayEvents.length;
            const dotColors = [...new Set(dayEvents.map((e) => colorOf(e.churchId)))].slice(0, 3);
            const isToday = cell.dateStr === todayStr;
            const isSelected = displayMode === 'calendar' && cell.dateStr === selectedDay;
            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => pickDay(cell.dateStr)}
                title={count ? `${count} evento${count === 1 ? '' : 's'}` : undefined}
                className={cn(
                  'relative h-8 !rounded-lg text-xs font-semibold flex items-center justify-center transition-colors',
                  isToday
                    ? 'bg-brand text-brand-fg'
                    : isSelected
                      ? 'bg-brand-soft text-brand-text'
                      : cell.inMonth
                        ? 'text-fg hover:bg-surface-2'
                        : 'text-fg-subtle/50 hover:bg-surface-2',
                )}
              >
                {cell.day}
                {count > 0 && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dotColors.map((color) => (
                      <span
                        key={color}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: isToday ? 'currentColor' : color }}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {multiChurch && onToggleChurch && (
        <section className="px-3 py-4">
          {renderSectionHeader(
            'churches',
            'Minhas igrejas',
            `${visibleChurchIds?.length ?? churches.length}/${churches.length}`,
          )}
          {isSectionOpen('churches') && (
          <ul className="space-y-0.5">
            {churches.map((c) => {
              const visible = !visibleChurchIds || visibleChurchIds.includes(c.id);
              const color = c.color || DEFAULT_CHURCH_COLOR;
              return (
                <li key={c.id} className="group relative">
                  <label
                    title={c.name}
                    className="flex items-center gap-2.5 px-1.5 py-1.5 pr-14 rounded-lg cursor-pointer hover:bg-surface-2 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggleChurch(c.id)}
                      className="peer sr-only"
                    />
                    <span
                      aria-hidden
                      className="w-[18px] h-[18px] shrink-0 rounded-[5px] border-2 flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1 peer-focus-visible:ring-brand"
                      style={{ borderColor: color, backgroundColor: visible ? color : 'transparent' }}
                    >
                      {visible && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 line-clamp-2 text-[13px] leading-snug text-fg">{c.name}</span>
                  </label>
                  {onShowOnlyChurch && (
                    <button
                      type="button"
                      onClick={() => onShowOnlyChurch(c.id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 !rounded-md text-[10px] font-semibold text-fg-muted hover:text-brand-text hover:bg-surface opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    >
                      Só esta
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          )}
        </section>
      )}

      {nextEvent && (
        <section className="px-3 py-4">
          {renderSectionHeader('next', 'Próximo evento')}
          {isSectionOpen('next') && (
          <button
            type="button"
            onClick={() => onOpenEvent(nextEvent.id)}
            className="w-full text-left group px-1.5"
          >
            <span className="block text-[15px] font-bold text-fg truncate group-hover:text-brand-text transition-colors">
              {nextEvent.title}
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-fg-muted">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="first-letter:uppercase">{relativeDay(nextEvent.date)}</span>
              {nextEvent.time && <span>· {nextEvent.time.slice(0, 5)}</span>}
              {multiChurch && (
                <span className="font-semibold truncate" style={{ color: colorOf(nextEvent.churchId) }}>
                  · {churchLabel(nextEvent.churchId)}
                </span>
              )}
            </span>
          </button>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-2 px-4 py-4">
        <div className="rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-xl font-extrabold text-fg leading-none">{thisWeekCount}</p>
          <p className="text-[11px] text-fg-muted mt-1">Próximos 7 dias</p>
        </div>
        <div className="rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-xl font-extrabold text-fg leading-none">{thisMonthCount}</p>
          <p className="text-[11px] text-fg-muted mt-1">Neste mês</p>
        </div>
      </div>

      <section className="px-3 py-4">
        {renderSectionHeader(
          'pending',
          'Pendências',
          isSectionOpen('pending') || pendingEvents.length === 0 ? (
            '30 dias'
          ) : (
            <span className="inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-warning-soft text-warning-text font-bold">
              {pendingEvents.length}
            </span>
          ),
        )}
        {!isSectionOpen('pending') ? null : pendingEvents.length === 0 ? (
          <p className="px-1.5 text-[13px] text-fg-muted">Tudo pronto para os próximos eventos.</p>
        ) : (
          <ul className="space-y-0.5">
            {pendingEvents.slice(0, 5).map((ev) => (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => onOpenEvent(ev.id)}
                  className="w-full flex items-start gap-2.5 px-1.5 py-1.5 !rounded-lg text-left hover:bg-surface-2 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-fg truncate">
                      {ev.title}
                      <span className="font-normal text-fg-muted"> · {relativeDay(ev.date)}</span>
                      {multiChurch && (
                        <span className="font-semibold" style={{ color: colorOf(ev.churchId) }}>
                          {' '}· {churchLabel(ev.churchId)}
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] text-fg-muted truncate">
                      Falta {missingParts(ev).join(', ')}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {pendingEvents.length > 5 && (
              <li className="px-1.5 pt-1 text-[11px] text-fg-subtle">
                +{pendingEvents.length - 5} evento{pendingEvents.length - 5 === 1 ? '' : 's'}
              </li>
            )}
          </ul>
        )}
      </section>
    </aside>
  );

  return (
    <PageShell
      hideHeader={embedded}
      width="full"
      icon={CalendarDays}
      title="Agenda"
      actions={embedded ? undefined : createMenu}
    >
      <div
        className={cn(
          !embedded &&
            'lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:-mt-3 lg:-ml-4 lg:-mb-8',
        )}
      >
      {!embedded && sidePanel}
      <div className={cn('min-w-0 space-y-4', !embedded && 'lg:pl-6 lg:pt-4 lg:pb-8')}>
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
          {embedded && createMenu}
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
                        className="block w-full truncate rounded px-1 py-0.5 text-[9px] sm:text-[10px] font-semibold border border-l-[3px] text-left bg-stone-800 text-stone-200 border-stone-700"
                        style={{ borderLeftColor: colorOf(ev.churchId) }}
                        title={multiChurch ? `${ev.title} · ${churchLabel(ev.churchId)}` : ev.title}
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
      </div>
      </div>

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
              {multiChurch && (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Igreja</label>
                  <div className="relative">
                    <span
                      aria-hidden
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full pointer-events-none"
                      style={{ backgroundColor: colorOf(formChurchId) }}
                    />
                    <select
                      value={formChurchId}
                      disabled={Boolean(editing)}
                      onChange={(e) => {
                        setFormChurchId(e.target.value);
                        setFormGroupId(groupsOf(e.target.value)[0]?.id || '');
                      }}
                      className="w-full bg-stone-800 border border-stone-700 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-100 disabled:opacity-70"
                    >
                      {churches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
                  {groupsOf(formChurchId).map((g) => (
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
    </PageShell>
  );
};
