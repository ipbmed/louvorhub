import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  Church,
  Clock,
  MoreVertical,
  Music2,
  Copy,
  CopyPlus,
  Edit3,
  FileText,
  Globe,
  Info,
  Link2,
  ListMusic,
  Lock,
  MessageCircle,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Users,
  X,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from 'lucide-react';
import type {
  ChurchEvent,
  Liturgy,
  MusicGroup,
  ScheduleSongCustomization,
  Setlist,
  Song,
  SystemUser,
  WorshipSchedule,
} from '../types';
import { useToast } from '@/contexts/ToastProvider';
import { useApiBusy } from '@/contexts/ApiBusyProvider';
import { normalizeShareSlug, validateShareSlug } from '@/lib/shareSlug';
import {
  eventShareUrl,
  updateEventShareSettings,
} from '@/services/eventShare';
import { ScheduleManager } from './ScheduleManager';
import { LiturgyManager } from './LiturgyManager';
import { EventLiturgySetlistSync, getLiturgySetlistDiff } from './EventLiturgySetlistSync';
import { AddSongsToEventSetlistModal } from './AddSongsToEventSetlistModal';
import { ScheduleSongEditorModal } from './ScheduleSongEditorModal';
import { EVENT_TITLE_SUGGESTIONS } from '../constants/eventTitles';
import { ActionButton, Badge, IconButton, cn } from './ui';

type EventTab = 'team' | 'liturgy' | 'setlist';

const EVENT_TAB_KEY = 'louvorhub_event_tab';
const EVENT_TABS: EventTab[] = ['team', 'liturgy', 'setlist'];

function readStoredTab(): EventTab {
  try {
    const stored = localStorage.getItem(EVENT_TAB_KEY) as EventTab | null;
    return stored && EVENT_TABS.includes(stored) ? stored : 'team';
  } catch {
    return 'team';
  }
}

function eventCountdown(
  date: string,
): { label: string; tone: 'brand' | 'warning' | 'neutral' } | null {
  const day = new Date(`${date}T00:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return { label: 'Hoje', tone: 'warning' };
  if (diff === 1) return { label: 'Amanhã', tone: 'brand' };
  if (diff > 1) return { label: `Em ${diff} dias`, tone: 'brand' };
  return { label: 'Realizado', tone: 'neutral' };
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Sugestão: 1 dia após o evento, no mesmo horário (ou 23:59). */
function suggestedShareExpiryLocal(eventDate: string, eventTime?: string): string {
  const time = (eventTime || '23:59').slice(0, 5);
  const base = new Date(`${eventDate}T${time}:00`);
  if (Number.isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    return toDatetimeLocalValue(fallback.toISOString());
  }
  base.setDate(base.getDate() + 1);
  return toDatetimeLocalValue(base.toISOString());
}

interface EventDetailProps {
  event: ChurchEvent;
  schedule: WorshipSchedule | null;
  liturgy: Liturgy | null;
  setlist: Setlist | null;
  songs: Song[];
  musicGroups: MusicGroup[];
  systemUsers?: SystemUser[];
  /** Nome da igreja do evento (boletim / cabeçalhos) */
  churchName?: string;
  canManageTeam: boolean;
  canManageLiturgy: boolean;
  canManageSetlist: boolean;
  onSaveSchedule: (schedule: WorshipSchedule | WorshipSchedule[]) => void | Promise<void>;
  onDeleteSchedule: (id: string) => void | Promise<void>;
  onSaveLiturgy: (liturgy: Liturgy) => void | Promise<void>;
  onDeleteLiturgy: (id: string) => void | Promise<void>;
  onEnsureLiturgy: () => void | Promise<void>;
  onSaveSetlist: (setlist: Setlist) => void | Promise<void>;
  onSaveEvent?: (event: ChurchEvent) => void | Promise<void>;
  onSaveSongVersion?: (customization: ScheduleSongCustomization) => void | Promise<void>;
  onResetSongVersion?: (songId: string) => void | Promise<void>;
  onSelectSong?: (song: Song, options?: { eventSongId?: string }) => void;
  onShareUpdated?: () => void | Promise<void>;
  onBack?: () => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  onBack,
  event,
  schedule,
  liturgy,
  setlist,
  songs,
  musicGroups,
  systemUsers = [],
  churchName,
  canManageTeam,
  canManageLiturgy,
  canManageSetlist,
  onSaveSchedule,
  onDeleteSchedule,
  onSaveLiturgy,
  onDeleteLiturgy,
  onEnsureLiturgy,
  onSaveSetlist,
  onSaveEvent,
  onSaveSongVersion,
  onResetSongVersion,
  onSelectSong,
  onShareUpdated,
}) => {
  const { showToast } = useToast();
  const { withBusy } = useApiBusy();
  const [tab, setTabState] = useState<EventTab>(readStoredTab);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const setTab = (next: EventTab) => {
    setTabState(next);
    try {
      localStorage.setItem(EVENT_TAB_KEY, next);
    } catch {
      /* armazenamento indisponível */
    }
  };
  const [addSongsOpen, setAddSongsOpen] = useState(false);
  const [savingSetlist, setSavingSetlist] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [formTitle, setFormTitle] = useState(event.title);
  const [formDate, setFormDate] = useState(event.date);
  const [formTime, setFormTime] = useState(event.time || '19:00');
  const [formTheme, setFormTheme] = useState(event.theme || '');
  const [formNotes, setFormNotes] = useState(event.notes || '');
  const [formGroupId, setFormGroupId] = useState(event.musicGroupId || '');
  const [versionConfirmSong, setVersionConfirmSong] = useState<Song | null>(null);
  const [versionEditor, setVersionEditor] = useState<{
    song: Song;
    customization: ScheduleSongCustomization | null;
  } | null>(null);
  const [shareEnabled, setShareEnabled] = useState(Boolean(event.shareEnabled));
  const [shareIncludeSongs, setShareIncludeSongs] = useState(
    event.shareIncludeSongs !== false,
  );
  const [shareIncludeLiturgy, setShareIncludeLiturgy] = useState(
    event.shareIncludeLiturgy !== false,
  );
  const [shareIncludeTeam, setShareIncludeTeam] = useState(Boolean(event.shareIncludeTeam));
  const [shareCodeDraft, setShareCodeDraft] = useState(event.shareCode || '');
  const [shareExpiresLocal, setShareExpiresLocal] = useState(() =>
    event.shareExpiresAt
      ? toDatetimeLocalValue(event.shareExpiresAt)
      : suggestedShareExpiryLocal(event.date, event.time),
  );
  const [shareSaving, setShareSaving] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);

  useEffect(() => {
    setShareEnabled(Boolean(event.shareEnabled));
    setShareIncludeSongs(event.shareIncludeSongs !== false);
    setShareIncludeLiturgy(event.shareIncludeLiturgy !== false);
    setShareIncludeTeam(Boolean(event.shareIncludeTeam));
    setShareCodeDraft(event.shareCode || '');
    setShareExpiresLocal(
      event.shareExpiresAt
        ? toDatetimeLocalValue(event.shareExpiresAt)
        : suggestedShareExpiryLocal(event.date, event.time),
    );
  }, [
    event.id,
    event.date,
    event.time,
    event.shareEnabled,
    event.shareIncludeSongs,
    event.shareIncludeLiturgy,
    event.shareIncludeTeam,
    event.shareCode,
    event.shareExpiresAt,
  ]);

  const activeShareCode = normalizeShareSlug(shareCodeDraft) || event.shareCode || '';
  const shareUrl = activeShareCode ? eventShareUrl(activeShareCode) : '';

  const resolveExpiresAtIso = (required: boolean): string | null | undefined => {
    const value = shareExpiresLocal.trim();
    if (!value) {
      if (required) {
        showToast('Informe a validade do link.');
        return undefined;
      }
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      showToast('Data de validade inválida.');
      return undefined;
    }
    return parsed.toISOString();
  };

  const persistShareSettings = async (next: {
    enabled: boolean;
    includeSongs: boolean;
    includeLiturgy: boolean;
    includeTeam: boolean;
    shareCode?: string;
    expiresAt?: string | null;
  }) => {
    return withBusy(async () => {
      try {
        setShareSaving(true);
        const result = await updateEventShareSettings(event.id, next);
        setShareCodeDraft(result.shareCode);
        setShareExpiresLocal(
          result.shareExpiresAt
            ? toDatetimeLocalValue(result.shareExpiresAt)
            : suggestedShareExpiryLocal(event.date, event.time),
        );
        await onShareUpdated?.();
        showToast(
          next.enabled ? 'Compartilhamento atualizado.' : 'Link público desativado.',
        );
      } catch (err) {
        showToast((err as Error).message || 'Falha ao atualizar compartilhamento.');
        setShareEnabled(Boolean(event.shareEnabled));
        setShareIncludeSongs(event.shareIncludeSongs !== false);
        setShareIncludeLiturgy(event.shareIncludeLiturgy !== false);
        setShareIncludeTeam(Boolean(event.shareIncludeTeam));
        setShareCodeDraft(event.shareCode || '');
        setShareExpiresLocal(
          event.shareExpiresAt
            ? toDatetimeLocalValue(event.shareExpiresAt)
            : suggestedShareExpiryLocal(event.date, event.time),
        );
      } finally {
        setShareSaving(false);
      }
    });
  };

  const saveShareLinkDetails = () => {
    const slug = normalizeShareSlug(shareCodeDraft);
    const slugError = validateShareSlug(slug);
    if (slugError) {
      showToast(slugError);
      return;
    }
    const expiresAt = resolveExpiresAtIso(true);
    if (expiresAt === undefined) return;
    void persistShareSettings({
      enabled: shareEnabled,
      includeSongs: shareIncludeSongs,
      includeLiturgy: shareIncludeLiturgy,
      includeTeam: shareIncludeTeam,
      shareCode: slug,
      expiresAt,
    });
  };

  useEffect(() => {
    if (tab === 'team' && !canManageTeam) {
      setTabState(canManageLiturgy ? 'liturgy' : 'setlist');
    } else if (tab === 'liturgy' && !canManageLiturgy) {
      setTabState('setlist');
    }
  }, [tab, canManageTeam, canManageLiturgy]);

  useEffect(() => {
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormTime(event.time || '19:00');
    setFormTheme(event.theme || '');
    setFormNotes(event.notes || '');
    setFormGroupId(event.musicGroupId || '');
  }, [event]);

  const openEditEvent = () => {
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormTime(event.time || '19:00');
    setFormTheme(event.theme || '');
    setFormNotes(event.notes || '');
    setFormGroupId(event.musicGroupId || '');
    setIsEditEventOpen(true);
  };

  const handleSaveEventForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveEvent || !formDate || isSavingEvent) return;
    const title = formTitle.trim() || 'Culto';
    try {
      setIsSavingEvent(true);
      await onSaveEvent({
        ...event,
        title,
        date: formDate,
        time: formTime,
        serviceType: title,
        theme: formTheme || undefined,
        notes: formNotes || undefined,
        musicGroupId: formGroupId || undefined,
      });
      setIsEditEventOpen(false);
    } finally {
      setIsSavingEvent(false);
    }
  };

  const churchStub = useMemo(
    () => [
      {
        id: event.churchId,
        name: churchName?.trim() || 'Igreja',
        city: '',
        createdAt: event.createdAt,
      },
    ],
    [event.churchId, event.createdAt, churchName],
  );

  const scheduleForEvent: WorshipSchedule | null = schedule
    ? {
        ...schedule,
        eventId: event.id,
        churchId: event.churchId,
        date: schedule.date || event.date,
        musicGroupId: schedule.musicGroupId || event.musicGroupId,
      }
    : null;

  const ensureTeamSchedule = async () => {
    if (scheduleForEvent) return;
    await onSaveSchedule({
      id: '',
      churchId: event.churchId,
      eventId: event.id,
      musicGroupId: event.musicGroupId,
      date: event.date,
      time: event.time,
      serviceType: event.serviceType || event.title,
      theme: event.theme,
      assignments: [],
      songIds: [],
      notes: event.notes,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    });
  };

  const setlistItems = setlist?.items || [];

  const addSongsToSetlist = async (songIds: string[]) => {
    if (!setlist || !canManageSetlist || savingSetlist) return;
    const existing = new Set(setlistItems.map((i) => i.songId));
    const toAdd = songIds.filter((id) => !existing.has(id));
    if (!toAdd.length) return;
    try {
      setSavingSetlist(true);
      await onSaveSetlist({
        ...setlist,
        eventId: event.id,
        kind: 'group_schedule',
        date: event.date,
        title: setlist.title || `Repertório — ${event.title}`,
        items: [
          ...setlistItems,
          ...toAdd.map((songId, i) => ({
            id: `item-${Date.now()}-${i}-${songId.slice(0, 8)}`,
            songId,
          })),
        ],
      });
    } finally {
      setSavingSetlist(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!setlist || !canManageSetlist) return;
    await onSaveSetlist({
      ...setlist,
      eventId: event.id,
      kind: 'group_schedule',
      items: setlistItems.filter((i) => i.id !== itemId),
    });
  };

  const moveItem = async (index: number, direction: 'up' | 'down') => {
    if (!setlist || !canManageSetlist || savingSetlist) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= setlistItems.length) return;
    const items = [...setlistItems];
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    try {
      setSavingSetlist(true);
      await onSaveSetlist({
        ...setlist,
        eventId: event.id,
        kind: 'group_schedule',
        items,
      });
    } finally {
      setSavingSetlist(false);
    }
  };

  const repertoireSongIds = setlistItems.map((i) => i.songId);

  const openVersionEditor = (song: Song) => {
    if (!canManageSetlist) return;
    if (!scheduleForEvent) {
      void ensureTeamSchedule();
    }
    const custom =
      scheduleForEvent?.customSongs?.find((c) => c.songId === song.id) || null;
    setVersionConfirmSong(null);
    setVersionEditor({ song, customization: custom });
  };

  const requestVersionForEvent = (song: Song, alreadyCustomized: boolean) => {
    if (!canManageSetlist) return;
    if (alreadyCustomized) {
      openVersionEditor(song);
      return;
    }
    setVersionConfirmSong(song);
  };

  const saveSongVersion = (customization: ScheduleSongCustomization) => {
    if (!onSaveSongVersion) return;
    void Promise.resolve(onSaveSongVersion(customization)).finally(() => {
      setVersionEditor(null);
    });
  };

  const resetSongVersion = (songId: string) => {
    if (!onResetSongVersion) return;
    void Promise.resolve(onResetSongVersion(songId)).finally(() => {
      setVersionEditor(null);
    });
  };

  const syncDiff = useMemo(
    () => getLiturgySetlistDiff(liturgy, setlist),
    [liturgy, setlist],
  );
  const liturgyTabAlert =
    syncDiff.missingInLiturgy.length > 0 ||
    Boolean(!liturgy && syncDiff.setlistSongIds.length > 0);
  const setlistTabAlert = syncDiff.missingInSetlist.length > 0;

  const tabs: {
    id: EventTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    show: boolean;
    alert?: boolean;
  }[] = [
    { id: 'team', label: 'Equipe de louvor', icon: Users, show: canManageTeam },
    {
      id: 'liturgy',
      label: 'Liturgia',
      icon: FileText,
      show: canManageLiturgy,
      alert: liturgyTabAlert,
    },
    {
      id: 'setlist',
      label: 'Repertório',
      icon: ListMusic,
      show: true,
      alert: setlistTabAlert,
    },
  ];

  const copyShareLink = () => {
    void navigator.clipboard.writeText(eventShareUrl(event.shareCode || activeShareCode));
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    const url = eventShareUrl(event.shareCode || activeShareCode);
    const text = `📅 *${event.title}*\n🔗 ${url}\n\n✨ LouvorHub`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const eventDay = new Date(`${event.date}T00:00:00`);
  const countdown = eventCountdown(event.date);
  const groupName = musicGroups.find((g) => g.id === event.musicGroupId)?.name;
  const subtitle = [churchName, groupName].filter(Boolean).join(' · ');

  const assignments = scheduleForEvent?.assignments ?? [];
  const confirmedCount = assignments.filter((a) => a.status === 'confirmed').length;
  const declinedCount = assignments.filter((a) => a.status === 'declined').length;
  const liturgyItemCount = liturgy?.items.length ?? 0;

  type ChecklistStatus = 'done' | 'pending' | 'alert';
  const checklist: {
    id: string;
    label: string;
    detail: string;
    status: ChecklistStatus;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }[] = [
    ...(canManageTeam
      ? [
          {
            id: 'team',
            label: 'Equipe de louvor',
            icon: Users,
            onClick: () => setTab('team'),
            ...(!scheduleForEvent
              ? { detail: 'Escala não criada', status: 'pending' as const }
              : scheduleForEvent.isFinalized
                ? { detail: `Finalizada · ${assignments.length} integrantes`, status: 'done' as const }
                : assignments.length === 0
                  ? { detail: 'Nenhum integrante escalado', status: 'pending' as const }
                  : {
                      detail: `${confirmedCount}/${assignments.length} confirmados${
                        declinedCount ? ` · ${declinedCount} indisponível${declinedCount > 1 ? 'is' : ''}` : ''
                      }`,
                      status: (declinedCount
                        ? 'alert'
                        : confirmedCount === assignments.length
                          ? 'done'
                          : 'pending') as ChecklistStatus,
                    }),
          },
        ]
      : []),
    ...(canManageLiturgy
      ? [
          {
            id: 'liturgy',
            label: 'Liturgia',
            icon: FileText,
            onClick: () => setTab('liturgy'),
            detail: !liturgy
              ? 'Não criada'
              : liturgyTabAlert
                ? 'Diferente do repertório'
                : `${liturgyItemCount} momento${liturgyItemCount === 1 ? '' : 's'}`,
            status: (!liturgy || liturgyItemCount === 0
              ? 'pending'
              : liturgyTabAlert
                ? 'alert'
                : 'done') as ChecklistStatus,
          },
        ]
      : []),
    {
      id: 'setlist',
      label: 'Repertório',
      icon: ListMusic,
      onClick: () => setTab('setlist'),
      detail: setlistTabAlert
        ? 'Diferente da liturgia'
        : `${setlistItems.length} música${setlistItems.length === 1 ? '' : 's'}`,
      status: (setlistItems.length === 0
        ? 'pending'
        : setlistTabAlert
          ? 'alert'
          : 'done') as ChecklistStatus,
    },
    {
      id: 'share',
      label: 'Link público',
      icon: Link2,
      onClick: () => setSharePanelOpen(true),
      detail: shareEnabled ? 'Ativo' : 'Desativado',
      status: (shareEnabled ? 'done' : 'pending') as ChecklistStatus,
    },
  ];
  const doneCount = checklist.filter((c) => c.status === 'done').length;

  const CHECK_TONE: Record<ChecklistStatus, string> = {
    done: 'bg-brand-soft text-brand-text',
    pending: 'bg-muted text-fg-subtle',
    alert: 'bg-warning-soft text-warning-text',
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-5">
      <header className="flex items-start gap-3 min-w-0">
        {onBack && (
          <IconButton
            icon={ArrowLeft}
            label="Voltar"
            variant="ghost"
            onClick={onBack}
            className="-ml-1 mt-1 shrink-0 bg-surface shadow-card"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-brand-text">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="leading-snug">
              <span className="sm:hidden">
                {eventDay.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                })}
              </span>
              <span className="hidden sm:inline">
                {eventDay.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
              {event.time ? ` · ${event.time}` : ''}
            </span>
            {countdown && (
              <Badge tone={countdown.tone} className="normal-case tracking-normal">
                {countdown.label}
              </Badge>
            )}
          </div>
          <h1 className="mt-1 text-[22px] sm:text-2xl xl:text-3xl font-extrabold text-fg leading-tight tracking-tight truncate">
            {event.title}
          </h1>
          {(subtitle || event.theme) && (
            <p className="mt-0.5 text-[13px] sm:text-sm text-fg-muted leading-snug line-clamp-2">
              {subtitle}
              {subtitle && event.theme ? ' · ' : ''}
              {event.theme ? `Tema: ${event.theme}` : ''}
            </p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0 mt-1">
          {onSaveEvent && (
            <ActionButton variant="light" icon={Edit3} onClick={openEditEvent}>
              Editar
            </ActionButton>
          )}
          <ActionButton
            variant={sharePanelOpen || shareEnabled ? 'secondary' : 'light'}
            icon={Share2}
            onClick={() => setSharePanelOpen((v) => !v)}
            aria-pressed={sharePanelOpen}
            title={shareEnabled ? 'Compartilhamento ativo' : 'Compartilhar evento'}
          >
            Compartilhar
          </ActionButton>
        </div>
        <div className="relative sm:hidden shrink-0 mt-1">
          <ActionButton
            variant="light"
            icon={MoreVertical}
            onClick={() => setActionsMenuOpen((v) => !v)}
            aria-label="Ações do evento"
            aria-haspopup="menu"
            aria-expanded={actionsMenuOpen}
          />
          {actionsMenuOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setActionsMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-line bg-surface shadow-card-lg p-1"
              >
                {onSaveEvent && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      openEditEvent();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-fg hover:bg-surface-2"
                  >
                    <Edit3 className="w-4 h-4 text-fg-muted" />
                    Editar evento
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActionsMenuOpen(false);
                    setSharePanelOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-fg hover:bg-surface-2"
                >
                  <Share2 className="w-4 h-4 text-fg-muted" />
                  Compartilhar
                  {shareEnabled && (
                    <Badge tone="brand" className="ml-auto">
                      Ativo
                    </Badge>
                  )}
                </button>
                {shareEnabled && shareUrl && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      copyShareLink();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-fg hover:bg-surface-2"
                  >
                    <Copy className="w-4 h-4 text-fg-muted" />
                    Copiar link
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      <div className="space-y-4 sm:space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem] lg:gap-6 lg:items-start">
      <div className="min-w-0 space-y-4 sm:space-y-5">

      {sharePanelOpen && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-100 inline-flex items-center gap-2">
                <Link2 className="w-4 h-4 text-emerald-400" />
                Link público do evento
              </h3>
              <p className="text-[11px] text-stone-500 mt-1">
                Quem tiver o link verá apenas as seções marcadas abaixo.
              </p>
            </div>
            <ActionButton
              variant={shareEnabled ? 'secondary' : 'light'}
              icon={shareEnabled ? Globe : Lock}
              loading={shareSaving}
              aria-pressed={shareEnabled}
              onClick={() => {
                const next = !shareEnabled;
                if (next) {
                  const expiry =
                    shareExpiresLocal.trim() ||
                    suggestedShareExpiryLocal(event.date, event.time);
                  setShareExpiresLocal(expiry);
                  const expiresAt = new Date(expiry).toISOString();
                  if (Number.isNaN(new Date(expiry).getTime())) {
                    showToast('Informe a validade do link.');
                    return;
                  }
                  setShareEnabled(true);
                  void persistShareSettings({
                    enabled: true,
                    includeSongs: shareIncludeSongs,
                    includeLiturgy: shareIncludeLiturgy,
                    includeTeam: shareIncludeTeam,
                    expiresAt,
                  });
                  return;
                }
                setShareEnabled(false);
                void persistShareSettings({
                  enabled: false,
                  includeSongs: shareIncludeSongs,
                  includeLiturgy: shareIncludeLiturgy,
                  includeTeam: shareIncludeTeam,
                });
              }}
            >
              {shareEnabled ? 'Ativo' : 'Desativado'}
            </ActionButton>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shareIncludeSongs}
                disabled={shareSaving}
                onChange={(e) => {
                  const includeSongs = e.target.checked;
                  setShareIncludeSongs(includeSongs);
                  void persistShareSettings({
                    enabled: shareEnabled,
                    includeSongs,
                    includeLiturgy: shareIncludeLiturgy,
                    includeTeam: shareIncludeTeam,
                  });
                }}
                className="rounded border-stone-600"
              />
              Músicas
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shareIncludeLiturgy}
                disabled={shareSaving}
                onChange={(e) => {
                  const includeLiturgy = e.target.checked;
                  setShareIncludeLiturgy(includeLiturgy);
                  void persistShareSettings({
                    enabled: shareEnabled,
                    includeSongs: shareIncludeSongs,
                    includeLiturgy,
                    includeTeam: shareIncludeTeam,
                  });
                }}
                className="rounded border-stone-600"
              />
              Liturgia
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
              <input
                type="checkbox"
                checked={shareIncludeTeam}
                disabled={shareSaving}
                onChange={(e) => {
                  const includeTeam = e.target.checked;
                  setShareIncludeTeam(includeTeam);
                  void persistShareSettings({
                    enabled: shareEnabled,
                    includeSongs: shareIncludeSongs,
                    includeLiturgy: shareIncludeLiturgy,
                    includeTeam,
                  });
                }}
                className="rounded border-stone-600"
              />
              Equipe (escala)
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Nome do link
              </label>
              <div className="flex items-center gap-1.5 bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5">
                <span className="text-[10px] text-stone-500 shrink-0">/evento/</span>
                <input
                  value={shareCodeDraft}
                  onChange={(e) => setShareCodeDraft(e.target.value)}
                  onBlur={() => setShareCodeDraft((v) => normalizeShareSlug(v) || v)}
                  placeholder="culto-domingo"
                  disabled={shareSaving}
                  className="min-w-0 flex-1 bg-transparent text-xs text-emerald-200 font-mono focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Validade do link <span className="text-rose-400">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={shareExpiresLocal}
                onChange={(e) => setShareExpiresLocal(e.target.value)}
                disabled={shareSaving}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-100"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Obrigatória. Sugestão: 1 dia após o evento.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton variant="secondary" icon={Check} disabled={shareSaving} onClick={saveShareLinkDetails}>
              Salvar nome e validade
            </ActionButton>
            <ActionButton
              variant="light"
              icon={Calendar}
              disabled={shareSaving}
              onClick={() =>
                setShareExpiresLocal(suggestedShareExpiryLocal(event.date, event.time))
              }
            >
              Usar sugestão (+1 dia)
            </ActionButton>
          </div>

          {shareEnabled && shareUrl ? (
            <div className="space-y-2">
              <p className="text-[11px] text-stone-500 break-all">
                Link:{' '}
                <span className="text-emerald-300/90 font-mono">{shareUrl}</span>
              </p>
              {event.shareExpiresAt && (
                <p className="text-[11px] text-amber-200/90">
                  Expira em{' '}
                  {new Date(event.shareExpiresAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  variant="light"
                  icon={shareCopied ? Check : Copy}
                  onClick={copyShareLink}
                >
                  {shareCopied ? 'Copiado' : 'Copiar link'}
                </ActionButton>
                <ActionButton variant="primary" icon={MessageCircle} onClick={shareOnWhatsApp}>
                  WhatsApp
                </ActionButton>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-stone-500">
              Ative o link para compartilhar liturgia, músicas e/ou equipe com quem não tem
              acesso ao app.
            </p>
          )}
        </div>
      )}

      <div className="sticky top-[calc(60px+env(safe-area-inset-top,0px))] lg:top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pt-2 pb-1 -mt-2 bg-app/90 backdrop-blur-md">
      <div className="flex flex-row gap-1 bg-stone-950 border border-stone-800 p-1 rounded-xl w-full">
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                title={t.alert ? `${t.label} — há pendências de sincronização` : t.label}
                className={`relative flex-1 min-w-0 px-2 sm:px-4 py-2.5 sm:py-2 rounded-button text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                  tab === t.id
                    ? 'bg-emerald-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.label}</span>
                {t.alert && (
                  <AlertTriangle
                    className={`w-3.5 h-3.5 shrink-0 ${
                      tab === t.id ? 'text-amber-900' : 'text-amber-400'
                    }`}
                    aria-label="Pendências"
                  />
                )}
              </button>
            );
          })}
      </div>
      </div>

      {tab === 'team' && canManageTeam && (
        <div className="w-full space-y-4">
          {!scheduleForEvent ? (
            <div className="text-center py-10 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              <Users className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <p className="text-sm text-stone-300 font-semibold mb-3">
                Ainda não há escala neste evento
              </p>
              <ActionButton variant="primary" icon={Plus} onClick={() => void ensureTeamSchedule()}>
                Criar equipe de louvor
              </ActionButton>
            </div>
          ) : (
            <ScheduleManager
              schedules={[scheduleForEvent]}
              churches={churchStub}
              musicGroups={musicGroups}
              songs={songs}
              systemUsers={systemUsers}
              activeChurchId={event.churchId}
              embedded
              onSaveSchedule={onSaveSchedule}
              onDeleteSchedule={onDeleteSchedule}
              onSelectSong={onSelectSong}
            />
          )}
        </div>
      )}

      {tab === 'liturgy' && canManageLiturgy && (
        <div className="w-full space-y-3 sm:space-y-4">
          <EventLiturgySetlistSync
            scope="liturgy"
            liturgy={liturgy}
            setlist={setlist}
            songs={songs}
            canManageLiturgy={canManageLiturgy}
            canManageSetlist={canManageSetlist}
            onSaveLiturgy={onSaveLiturgy}
            onSaveSetlist={onSaveSetlist}
            onEnsureLiturgy={onEnsureLiturgy}
            eventId={event.id}
            eventTitle={event.title}
            eventDate={event.date}
          />
          {!liturgy ? (
            <div className="text-center py-10 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              <FileText className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <p className="text-sm text-stone-300 font-semibold mb-3">
                Ainda não há liturgia neste evento
              </p>
              <ActionButton variant="primary" icon={Plus} onClick={() => void onEnsureLiturgy()}>
                Criar liturgia
              </ActionButton>
            </div>
          ) : (
            <LiturgyManager
              liturgies={[
                {
                  ...liturgy,
                  eventId: event.id,
                  churchId: event.churchId,
                  date: liturgy.date || event.date,
                  serviceTitle: event.title || liturgy.serviceTitle,
                },
              ]}
              churches={churchStub}
              songs={songs}
              activeChurchId={event.churchId}
              linkedEventTitle={event.title}
              linkedEventDate={event.date}
              embedded
              canManageLiturgies={() => true}
              onSaveLiturgy={onSaveLiturgy}
              onDeleteLiturgy={onDeleteLiturgy}
              onSelectSong={onSelectSong}
            />
          )}
        </div>
      )}

      {tab === 'setlist' && (
        <div className="w-full space-y-3 sm:space-y-4">
          <EventLiturgySetlistSync
            scope="setlist"
            liturgy={liturgy}
            setlist={setlist}
            songs={songs}
            canManageLiturgy={canManageLiturgy}
            canManageSetlist={canManageSetlist}
            onSaveLiturgy={onSaveLiturgy}
            onSaveSetlist={onSaveSetlist}
            onEnsureLiturgy={onEnsureLiturgy}
            eventId={event.id}
            eventTitle={event.title}
            eventDate={event.date}
          />
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-md w-full">
          {canManageSetlist && setlist && (
            <div className="mb-3">
              <ActionButton variant="primary" icon={Plus} onClick={() => setAddSongsOpen(true)}>
                Selecionar músicas
              </ActionButton>
            </div>
          )}

          {!setlist ? (
            <p className="text-xs text-stone-500">
              Repertório ainda não vinculado. Salve o evento novamente ou crie a equipe para gerar o repertório.
            </p>
          ) : setlistItems.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-stone-800 rounded-xl">
              <p className="text-xs text-stone-500 italic mb-3">
                Nenhuma música neste repertório.
              </p>
              {canManageSetlist && (
                <ActionButton variant="secondary" icon={Plus} onClick={() => setAddSongsOpen(true)}>
                  Selecionar músicas
                </ActionButton>
              )}
            </div>
          ) : (
            <ul className="space-y-2">
              {setlistItems.map((item, index) => {
                const song = songs.find((s) => s.id === item.songId);
                const custom = schedule?.customSongs?.find((c) => c.songId === item.songId);
                const isCustomized = Boolean(custom?.isCustomized || custom?.eventSongId);
                const displaySong: Song | undefined = song
                  ? {
                      ...song,
                      originalKey: custom?.originalKey || song.originalKey,
                      lyrics: custom?.lyrics || song.lyrics,
                      timeSignature: custom?.timeSignature || song.timeSignature,
                      notes: custom?.notes || song.notes,
                    }
                  : undefined;
                const versionId = custom?.eventSongId || (isCustomized ? item.id : undefined);

                return (
                  <li
                    key={item.id}
                    className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 ${
                      isCustomized
                        ? 'bg-emerald-950/30 light:bg-emerald-50 border-emerald-800/50 light:border-emerald-200'
                        : 'bg-stone-950/60 light:bg-slate-50 border-stone-800 light:border-stone-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        displaySong &&
                        onSelectSong?.(
                          displaySong,
                          versionId ? { eventSongId: versionId } : undefined,
                        )
                      }
                      className="text-left text-xs text-stone-200 light:text-stone-900 truncate flex-1 min-w-0"
                    >
                      <span className="text-emerald-400 light:text-emerald-700 font-mono mr-1.5">
                        {index + 1}.
                      </span>
                      {song
                        ? `${song.songType === 'hino' && song.number ? `#${song.number} ` : ''}${song.title}`
                        : 'Música removida'}
                      {custom?.originalKey && (
                        <span className="ml-2 text-[10px] font-mono text-emerald-300">
                          Tom: {custom.originalKey}
                        </span>
                      )}
                      {isCustomized && (
                        <span className="ml-2 text-[9px] uppercase font-black text-emerald-400">
                          Versão do evento
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canManageSetlist && (
                        <>
                          <ActionButton
                            variant="light"
                            icon={ArrowUp}
                            onClick={() => void moveItem(index, 'up')}
                            disabled={index === 0 || savingSetlist}
                            title="Mover para cima"
                            aria-label="Mover para cima"
                          />
                          <ActionButton
                            variant="light"
                            icon={ArrowDown}
                            onClick={() => void moveItem(index, 'down')}
                            disabled={index === setlistItems.length - 1 || savingSetlist}
                            title="Mover para baixo"
                            aria-label="Mover para baixo"
                          />
                        </>
                      )}
                      {canManageSetlist && song && (
                        <ActionButton
                          variant={isCustomized ? 'light' : 'secondary'}
                          icon={isCustomized ? Edit3 : CopyPlus}
                          collapseLabel
                          onClick={() => requestVersionForEvent(song, isCustomized)}
                          title={
                            isCustomized
                              ? 'Editar versão deste evento'
                              : 'Criar versão exclusiva para o evento'
                          }
                        >
                          {isCustomized ? 'Editar versão' : 'Criar versão'}
                        </ActionButton>
                      )}
                      {canManageSetlist && (
                        <ActionButton
                          variant="danger"
                          icon={Trash2}
                          onClick={() => void removeItem(item.id)}
                          title="Remover do repertório"
                          aria-label="Remover do repertório"
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        </div>
      )}
      </div>

      <aside className="hidden lg:block lg:sticky lg:top-6 space-y-4">
        <section className="bg-surface border border-line rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2 className="text-sm font-bold text-fg">Preparação</h2>
            <span className="text-[11px] font-semibold text-fg-muted">
              {doneCount} de {checklist.length} prontos
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-brand transition-all duration-500"
              style={{ width: `${(doneCount / checklist.length) * 100}%` }}
            />
          </div>
          <ul className="-mx-2 space-y-0.5">
            {checklist.map((item) => {
              const Icon = item.status === 'done' ? Check : item.status === 'alert' ? AlertTriangle : item.icon;
              const isActive = item.id === tab || (item.id === 'share' && sharePanelOpen);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={item.onClick}
                    className={cn(
                      'w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left transition-colors hover:bg-surface-2',
                      isActive && 'bg-surface-2',
                    )}
                  >
                    <span
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        CHECK_TONE[item.status],
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-fg truncate">{item.label}</span>
                      <span
                        className={cn(
                          'block text-[11px] truncate',
                          item.status === 'alert' ? 'text-warning-text' : 'text-fg-muted',
                        )}
                      >
                        {item.detail}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-fg-subtle shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
          {shareEnabled && shareUrl && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-line">
              <ActionButton variant="light" icon={shareCopied ? Check : Copy} onClick={copyShareLink}>
                {shareCopied ? 'Copiado' : 'Copiar link'}
              </ActionButton>
              <ActionButton variant="primary" icon={MessageCircle} onClick={shareOnWhatsApp}>
                WhatsApp
              </ActionButton>
            </div>
          )}
        </section>

        <section className="bg-surface border border-line rounded-2xl shadow-card p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-fg">Detalhes</h2>
            {onSaveEvent && (
              <ActionButton variant="light" icon={Edit3} onClick={openEditEvent} aria-label="Editar evento" />
            )}
          </div>
          <dl className="space-y-3 text-[13px]">
            <div className="flex gap-3">
              <dt className="sr-only">Data</dt>
              <Calendar className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
              <dd className="text-fg first-letter:uppercase">
                {eventDay.toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
            {event.time && (
              <div className="flex gap-3">
                <dt className="sr-only">Horário</dt>
                <Clock className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
                <dd className="text-fg">{event.time}</dd>
              </div>
            )}
            {churchName && (
              <div className="flex gap-3">
                <dt className="sr-only">Igreja</dt>
                <Church className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
                <dd className="text-fg min-w-0 break-words">{churchName}</dd>
              </div>
            )}
            {groupName && (
              <div className="flex gap-3">
                <dt className="sr-only">Grupo musical</dt>
                <Music2 className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
                <dd className="text-fg min-w-0 break-words">{groupName}</dd>
              </div>
            )}
            {event.theme && (
              <div className="flex gap-3">
                <dt className="sr-only">Tema</dt>
                <Sparkles className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
                <dd className="text-fg min-w-0 break-words">{event.theme}</dd>
              </div>
            )}
            {event.notes && (
              <div className="flex gap-3">
                <dt className="sr-only">Observações</dt>
                <Info className="w-4 h-4 text-fg-subtle shrink-0 mt-0.5" />
                <dd className="text-fg-muted min-w-0 break-words whitespace-pre-line line-clamp-6">
                  {event.notes}
                </dd>
              </div>
            )}
          </dl>
        </section>
      </aside>
      </div>

      {isEditEventOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-display font-bold text-stone-100">Editar Evento</h3>
              <ActionButton
                variant="light"
                icon={X}
                onClick={() => setIsEditEventOpen(false)}
                aria-label="Fechar"
                title="Fechar"
              />
            </div>
            <form onSubmit={handleSaveEventForm} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Título</label>
                <input
                  required
                  list="event-detail-title-suggestions"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex.: Culto, Escola Bíblica…"
                  className="w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100"
                />
                <datalist id="event-detail-title-suggestions">
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
              <div className="pt-2 flex justify-end gap-2 border-t border-stone-800">
                <ActionButton variant="light" disabled={isSavingEvent} onClick={() => setIsEditEventOpen(false)}>
                  Cancelar
                </ActionButton>
                <ActionButton type="submit" variant="primary" icon={Check} loading={isSavingEvent}>
                  {isSavingEvent ? 'Salvando...' : 'Salvar'}
                </ActionButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {addSongsOpen && setlist && (
        <AddSongsToEventSetlistModal
          songs={songs}
          existingSongIds={setlistItems.map((i) => i.songId)}
          saving={savingSetlist}
          onClose={() => setAddSongsOpen(false)}
          onAdd={addSongsToSetlist}
        />
      )}

      {versionConfirmSong && (
        <div className="fixed inset-0 z-[60] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-stone-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-stone-100">
                    Versão para o evento
                  </h3>
                  <p className="text-xs text-stone-400 mt-1">
                    {versionConfirmSong.songType === 'hino' && versionConfirmSong.number
                      ? `Hino #${versionConfirmSong.number} · `
                      : ''}
                    {versionConfirmSong.title}
                  </p>
                </div>
              </div>
              <ActionButton
                variant="light"
                icon={X}
                onClick={() => setVersionConfirmSong(null)}
                aria-label="Fechar"
                title="Fechar"
              />
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-2.5 rounded-xl border border-emerald-800/40 bg-emerald-950/30 p-3">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-stone-300 leading-relaxed space-y-2">
                  <p>
                    Será criada uma <span className="text-emerald-300 font-semibold">versão exclusiva</span> desta
                    música para este evento (tom, cifra, andamento e observações).
                  </p>
                  <p>
                    A <span className="text-stone-100 font-semibold">versão principal do catálogo não será alterada</span>.
                    Outros cultos e repertórios continuam usando o original.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <ActionButton variant="light" onClick={() => setVersionConfirmSong(null)}>
                  Cancelar
                </ActionButton>
                <ActionButton variant="primary" icon={CopyPlus} onClick={() => openVersionEditor(versionConfirmSong)}>
                  Continuar
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {versionEditor && (
        <ScheduleSongEditorModal
          schedule={
            scheduleForEvent || {
              id: '',
              churchId: event.churchId,
              eventId: event.id,
              date: event.date,
              time: event.time,
              serviceType: event.serviceType || event.title,
              assignments: [],
              songIds: repertoireSongIds,
              status: 'confirmed',
              createdAt: event.createdAt,
            }
          }
          song={versionEditor.song}
          customization={
            schedule?.customSongs?.find((c) => c.songId === versionEditor.song.id) ||
            versionEditor.customization
          }
          onSave={saveSongVersion}
          onResetToOriginal={() => resetSongVersion(versionEditor.song.id)}
          onClose={() => setVersionEditor(null)}
        />
      )}
    </div>
  );
};
