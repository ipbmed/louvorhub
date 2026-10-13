import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import {
  BookOpen,
  Calendar,
  Check,
  Mic,
  UserRound,
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
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import type {
  ChurchEvent,
  Liturgy,
  LiturgyItem,
  MusicGroup,
  ScheduleMemberAssignment,
  ScheduleSongCustomization,
  Setlist,
  Song,
  SystemUser,
  WorshipSchedule,
} from '../types';
import { useToast } from '@/contexts/ToastProvider';
import { useApiBusy } from '@/contexts/ApiBusyProvider';
import { type AssistantScreen, useAssistantScreen } from '@/contexts/AssistantProvider';
import type { AssistantAssignment, AssistantTeamMember } from '@/services/assistant';
import { SCHEDULE_ROLE_OPTIONS, getProfileSkills } from '@/constants/skills';
import { normalizeShareSlug, validateShareSlug } from '@/lib/shareSlug';
import {
  eventShareUrl,
  updateEventShareSettings,
} from '@/services/eventShare';
import { EventTeamPanel } from './EventTeamPanel';
import { EventLiturgyPanel } from './EventLiturgyPanel';
import { EventLiturgySetlistSync, getLiturgySetlistDiff } from './EventLiturgySetlistSync';
import { AddSongsToEventSetlistModal } from './AddSongsToEventSetlistModal';
import { ScheduleSongEditorModal } from './ScheduleSongEditorModal';
import { EVENT_TITLE_SUGGESTIONS } from '../constants/eventTitles';
import { ActionButton, Badge, EmptyState, Field, Input, Modal, Select, Textarea, cn } from './ui';
import { PageHeaderButton, PageShell } from './PageHeader';

type EventTab = 'team' | 'liturgy' | 'setlist' | 'share';

const EVENT_TAB_KEY = 'louvorhub_event_tab';
const EVENT_TABS: EventTab[] = ['team', 'liturgy', 'setlist', 'share'];

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

interface SortableSetlistItemProps {
  id: string;
  index: number;
  draggable: boolean;
  className: string;
  onDragEnd: () => void;
  onMove: (direction: 'up' | 'down') => void;
  children: React.ReactNode;
}

/** Item do repertório reordenável pela alça (mouse/toque) ou pelas setas do teclado na alça. */
const SortableSetlistItem: React.FC<SortableSetlistItemProps> = ({
  id,
  index,
  draggable,
  className,
  onDragEnd,
  onMove,
  children,
}) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.01, boxShadow: '0 12px 32px -12px rgba(0,0,0,0.35)', zIndex: 10 }}
      className={cn('relative', className)}
    >
      {draggable && (
        <button
          type="button"
          onPointerDown={(e) => dragControls.start(e)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              onMove(e.key === 'ArrowUp' ? 'up' : 'down');
            }
          }}
          style={{ touchAction: 'none' }}
          className="-ml-1 w-7 h-9 shrink-0 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-2 cursor-grab active:cursor-grabbing"
          aria-label={`Arrastar música ${index + 1} (setas para mover)`}
          title="Arraste para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}
      {children}
    </Reorder.Item>
  );
};

interface SetlistItemMenuProps {
  songTitle: string;
  versionLabel?: string;
  versionIcon: React.ElementType;
  onVersion?: () => void;
  onRemove: () => void;
}

/** Menu de ações de uma música do repertório (telas pequenas). */
const SetlistItemMenu: React.FC<SetlistItemMenuProps> = ({
  songTitle,
  versionLabel,
  versionIcon: VersionIcon,
  onVersion,
  onRemove,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="relative">
      <ActionButton
        variant="light"
        icon={MoreVertical}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Opções de ${songTitle}`}
        aria-haspopup="menu"
        aria-expanded={open}
      />
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-line bg-surface shadow-card-lg p-1"
          >
            {onVersion && versionLabel && (
              <button
                type="button"
                role="menuitem"
                onClick={() => run(onVersion)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-fg hover:bg-surface-2"
              >
                <VersionIcon className="w-4 h-4 text-fg-muted" />
                {versionLabel}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onRemove)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-danger-text hover:bg-danger-soft"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
};

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
  onSaveLiturgy: (liturgy: Liturgy, opts?: { silent?: boolean }) => void | Promise<void>;
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
  const [formBibleVerse, setFormBibleVerse] = useState(event.bibleVerse || '');
  const [formPreacher, setFormPreacher] = useState(event.preacher || '');
  const [formLeader, setFormLeader] = useState(event.leader || '');
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

  const resetEventForm = () => {
    setFormTitle(event.title);
    setFormDate(event.date);
    setFormTime(event.time || '19:00');
    setFormTheme(event.theme || '');
    setFormBibleVerse(event.bibleVerse || '');
    setFormPreacher(event.preacher || '');
    setFormLeader(event.leader || '');
    setFormNotes(event.notes || '');
    setFormGroupId(event.musicGroupId || '');
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(resetEventForm, [event]);

  const openEditEvent = () => {
    resetEventForm();
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
        theme: formTheme.trim() || undefined,
        bibleVerse: formBibleVerse.trim() || undefined,
        preacher: formPreacher.trim() || undefined,
        leader: formLeader.trim() || undefined,
        notes: formNotes || undefined,
        musicGroupId: formGroupId || undefined,
      });
      setIsEditEventOpen(false);
    } finally {
      setIsSavingEvent(false);
    }
  };

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

  /** Ordem local enquanto arrasta; só é gravada ao soltar. */
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const dragOrderRef = useRef<string[] | null>(null);
  const orderedSetlistItems = dragOrder
    ? dragOrder
        .map((id) => setlistItems.find((i) => i.id === id))
        .filter((i): i is (typeof setlistItems)[number] => Boolean(i))
    : setlistItems;

  const handleReorder = (ids: string[]) => {
    dragOrderRef.current = ids;
    setDragOrder(ids);
  };

  const commitDragOrder = async () => {
    const ids = dragOrderRef.current;
    dragOrderRef.current = null;
    if (!ids || !setlist || !canManageSetlist) {
      setDragOrder(null);
      return;
    }
    const unchanged = ids.length === setlistItems.length && ids.every((id, i) => setlistItems[i]?.id === id);
    if (unchanged) {
      setDragOrder(null);
      return;
    }
    const items = ids
      .map((id) => setlistItems.find((i) => i.id === id))
      .filter((i): i is (typeof setlistItems)[number] => Boolean(i));
    try {
      setSavingSetlist(true);
      await onSaveSetlist({ ...setlist, eventId: event.id, kind: 'group_schedule', items });
    } finally {
      setSavingSetlist(false);
      setDragOrder(null);
    }
  };

  const repertoireSongIds = setlistItems.map((i) => i.songId);

  const teamMembers = useMemo<AssistantTeamMember[]>(() => {
    const groupId = scheduleForEvent?.musicGroupId || event.musicGroupId;
    const group = musicGroups.find((g) => g.id === groupId);
    const seen = new Set<string>();
    const members: AssistantTeamMember[] = [];
    for (const g of group ? [group] : musicGroups) {
      for (const m of g.members) {
        const memberKey = m.userId || m.id;
        if (seen.has(memberKey)) continue;
        seen.add(memberKey);
        members.push({
          id: m.id,
          userId: m.userId,
          name: m.name,
          skills: getProfileSkills(systemUsers.find((u) => u.id === m.userId)),
        });
      }
    }
    return members;
  }, [scheduleForEvent?.musicGroupId, event.musicGroupId, musicGroups, systemUsers]);

  const applyLiturgyProposal = async (
    items: LiturgyItem[],
    meta: { theme?: string; bibleVerse?: string },
  ) => {
    const base: Liturgy = liturgy ?? {
      id: '',
      churchId: event.churchId,
      date: event.date,
      serviceTitle: event.title,
      items: [],
      createdAt: new Date().toISOString(),
    };
    await onSaveLiturgy({
      ...base,
      eventId: event.id,
      churchId: event.churchId,
      date: event.date,
      serviceTitle: event.title || base.serviceTitle,
      items,
    });
    const theme = event.theme || meta.theme?.trim() || undefined;
    const bibleVerse = event.bibleVerse || meta.bibleVerse?.trim() || undefined;
    if (onSaveEvent && (theme !== event.theme || bibleVerse !== event.bibleVerse)) {
      await onSaveEvent({ ...event, theme, bibleVerse });
    }
    const songIds = items.filter((i) => i.type === 'hymn' && i.songId).map((i) => i.songId!);
    if (songIds.length && canManageSetlist) await addSongsToSetlist(songIds);
  };

  const applyTeamProposal = async (proposed: AssistantAssignment[]) => {
    const previous = scheduleForEvent?.assignments ?? [];
    const assignments: ScheduleMemberAssignment[] = proposed.map((a) => {
      const kept = previous.find(
        (p) =>
          p.role.trim().toLowerCase() === a.role.trim().toLowerCase() &&
          ((a.userId && p.userId === a.userId) || p.memberId === a.memberId),
      );
      return (
        kept ?? {
          role: a.role,
          memberId: a.memberId,
          userId: a.userId ?? undefined,
          memberName: a.memberName,
          status: 'pending',
        }
      );
    });
    await onSaveSchedule(
      scheduleForEvent
        ? { ...scheduleForEvent, assignments }
        : {
            id: '',
            churchId: event.churchId,
            eventId: event.id,
            musicGroupId: event.musicGroupId,
            date: event.date,
            time: event.time,
            serviceType: event.serviceType || event.title,
            theme: event.theme,
            assignments,
            songIds: [],
            createdAt: new Date().toISOString(),
          },
    );
  };

  const assistantBase = {
    label: `${event.title} · ${new Date(`${event.date}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    })}`,
    eventId: event.id,
    theme: event.theme,
  };
  let assistantScreen: AssistantScreen | null = null;
  if (tab === 'setlist') {
    assistantScreen = {
      ...assistantBase,
      mode: 'setlist',
      key: `setlist:${event.id}`,
      bibleVerse: event.bibleVerse,
      songs,
      existingSongIds: repertoireSongIds,
      canApply: canManageSetlist && Boolean(setlist),
      onAddSongs: addSongsToSetlist,
    };
  } else if (tab === 'liturgy' && canManageLiturgy) {
    assistantScreen = {
      ...assistantBase,
      mode: 'liturgy',
      key: `liturgy:${event.id}`,
      bibleVerse: event.bibleVerse,
      preacher: event.preacher,
      leader: event.leader,
      songs,
      items: liturgy?.items ?? [],
      canApply: true,
      onApplyLiturgy: applyLiturgyProposal,
    };
  } else if (tab === 'team' && canManageTeam) {
    assistantScreen = {
      ...assistantBase,
      mode: 'schedule',
      key: `schedule:${event.id}`,
      members: teamMembers,
      roles: [...SCHEDULE_ROLE_OPTIONS],
      assignments: scheduleForEvent?.assignments ?? [],
      canApply: !scheduleForEvent?.isFinalized,
      onApplyTeam: applyTeamProposal,
    };
  }
  useAssistantScreen(assistantScreen);

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
    { id: 'share', label: 'Compartilhamento', icon: Share2, show: true },
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
      onClick: () => setTab('share'),
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

  const metaItemClass = 'inline-flex items-center gap-1.5 min-w-0';
  const metaIconClass = 'w-4 h-4 text-fg-subtle shrink-0';

  const headerDescription = (
    <div className="space-y-2 lg:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] sm:text-sm text-fg-muted">
        <span className={cn(metaItemClass, 'font-semibold text-brand-text')}>
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="inline-block first-letter:uppercase">
            <span className="sm:hidden">
              {eventDay.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </span>
            <span className="hidden sm:inline">
              {eventDay.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </span>
        </span>
        {event.time && (
          <span className={cn(metaItemClass, 'font-semibold text-fg')}>
            <Clock className={metaIconClass} />
            {event.time}
          </span>
        )}
        {countdown && <Badge tone={countdown.tone}>{countdown.label}</Badge>}
        {churchName && (
          <span className={metaItemClass}>
            <Church className={metaIconClass} />
            <span className="truncate">{churchName}</span>
          </span>
        )}
        {groupName && (
          <span className={metaItemClass}>
            <Music2 className={metaIconClass} />
            <span className="truncate">{groupName}</span>
          </span>
        )}
        {event.theme && (
          <span className={metaItemClass}>
            <Sparkles className={metaIconClass} />
            <span className="truncate">{event.theme}</span>
          </span>
        )}
        {event.bibleVerse && (
          <span className={metaItemClass}>
            <BookOpen className={metaIconClass} />
            <span className="truncate">{event.bibleVerse}</span>
          </span>
        )}
        {event.preacher && (
          <span className={metaItemClass}>
            <Mic className={metaIconClass} />
            <span className="truncate">{event.preacher}</span>
          </span>
        )}
        {event.leader && (
          <span className={metaItemClass}>
            <UserRound className={metaIconClass} />
            <span className="truncate">{event.leader}</span>
          </span>
        )}
      </div>
      {event.notes && (
        <p className="flex gap-1.5 text-[13px] text-fg-muted leading-snug">
          <Info className={cn(metaIconClass, 'mt-px')} />
          <span className="min-w-0 whitespace-pre-line line-clamp-2">{event.notes}</span>
        </p>
      )}
    </div>
  );

  const headerActions = (
    <>
        <div className="hidden sm:flex items-center gap-2">
          {onSaveEvent && (
            <PageHeaderButton variant="secondary" icon={Edit3} onClick={openEditEvent}>
              Editar
            </PageHeaderButton>
          )}
          <PageHeaderButton
            icon={Share2}
            onClick={() => setTab('share')}
            aria-pressed={tab === 'share'}
            title={shareEnabled ? 'Compartilhamento ativo' : 'Compartilhar evento'}
          >
            Compartilhar
          </PageHeaderButton>
        </div>
        <div className="relative sm:hidden">
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
                    setTab('share');
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
    </>
  );

  return (
    <PageShell
      icon={Calendar}
      title={event.title}
      onBack={onBack}
      actions={headerActions}
      contentClassName="sm:space-y-5"
      width="full"
    >
      {headerDescription}
      <div className="space-y-4 sm:space-y-5 lg:space-y-0 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:-mt-3 lg:-ml-4 lg:-mb-8">
      <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-start-2 lg:row-start-1 lg:pl-6 lg:pt-4 lg:pb-8">

      <div className="sticky top-[calc(60px+env(safe-area-inset-top,0px))] lg:top-16 z-10 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 pt-2 pb-1 -mt-2 bg-app/90 backdrop-blur-md">
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

      {tab === 'share' && (
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
            <Field label="Nome do link">
              {(id) => (
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-fg-subtle pointer-events-none">
                    /evento/
                  </span>
                  <Input
                    id={id}
                    value={shareCodeDraft}
                    onChange={(e) => setShareCodeDraft(e.target.value)}
                    onBlur={() => setShareCodeDraft((v) => normalizeShareSlug(v) || v)}
                    placeholder="culto-domingo"
                    disabled={shareSaving}
                    className="pl-[4.25rem] font-mono"
                  />
                </div>
              )}
            </Field>
            <Field label="Validade do link" required hint="Obrigatória. Sugestão: 1 dia após o evento.">
              {(id, describedBy) => (
                <Input
                  id={id}
                  type="datetime-local"
                  required
                  aria-describedby={describedBy}
                  value={shareExpiresLocal}
                  onChange={(e) => setShareExpiresLocal(e.target.value)}
                  disabled={shareSaving}
                />
              )}
            </Field>
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

      {tab === 'team' && canManageTeam && (
        <div className="w-full space-y-4">
          {!scheduleForEvent ? (
            <EmptyState
              icon={Users}
              title="Ainda não há equipe neste evento"
              description="Crie a escala para marcar o ensaio e adicionar as pessoas."
              action={
                <ActionButton variant="primary" icon={Plus} onClick={() => void ensureTeamSchedule()}>
                  Criar equipe de louvor
                </ActionButton>
              }
            />
          ) : (
            <EventTeamPanel
              schedule={scheduleForEvent}
              musicGroups={musicGroups}
              systemUsers={systemUsers}
              songs={songs}
              churchName={churchName}
              onSave={onSaveSchedule}
              onDelete={onDeleteSchedule}
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
            <EmptyState
              icon={FileText}
              title="Ainda não há liturgia neste evento"
              description="Crie a liturgia para montar a ordem do culto."
              action={
                <ActionButton variant="primary" icon={Plus} onClick={() => void onEnsureLiturgy()}>
                  Criar liturgia
                </ActionButton>
              }
            />
          ) : (
            <EventLiturgyPanel
              liturgy={{
                ...liturgy,
                eventId: event.id,
                churchId: event.churchId,
                date: event.date,
                serviceTitle: event.title || liturgy.serviceTitle,
              }}
              songs={songs}
              churchName={churchName}
              serviceInfo={event}
              onSave={onSaveLiturgy}
              onDelete={onDeleteLiturgy}
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
            <Reorder.Group
              as="ul"
              axis="y"
              values={orderedSetlistItems.map((i) => i.id)}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {orderedSetlistItems.map((item, index) => {
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
                  <SortableSetlistItem
                    key={item.id}
                    id={item.id}
                    index={index}
                    draggable={canManageSetlist && !savingSetlist && orderedSetlistItems.length > 1}
                    onDragEnd={() => void commitDragOrder()}
                    onMove={(direction) => void moveItem(index, direction)}
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
                    {canManageSetlist && (
                      <div className="sm:hidden shrink-0">
                        <SetlistItemMenu
                          songTitle={song?.title ?? 'música removida'}
                          versionLabel={isCustomized ? 'Editar versão' : 'Criar versão'}
                          versionIcon={isCustomized ? Edit3 : CopyPlus}
                          onVersion={song ? () => requestVersionForEvent(song, isCustomized) : undefined}
                          onRemove={() => void removeItem(item.id)}
                        />
                      </div>
                    )}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
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
                  </SortableSetlistItem>
                );
              })}
            </Reorder.Group>
          )}
          </div>
        </div>
      )}
      </div>

      <aside className="hidden lg:flex lg:flex-col lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:overflow-y-auto lg:col-start-1 lg:row-start-1 bg-surface border-r border-line divide-y divide-line [scrollbar-width:thin]">
        <section className="px-4 py-4">
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
              const isActive = item.id === tab;
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

        <section className="px-4 py-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-fg">Evento</h2>
            {onSaveEvent && (
              <button
                type="button"
                onClick={openEditEvent}
                className="text-[11px] font-semibold text-brand-text hover:underline"
              >
                Editar
              </button>
            )}
          </div>
          <dl className="space-y-3">
            {[
              {
                icon: Calendar,
                label: 'Data',
                value: (
                  <span className="inline-block first-letter:uppercase">
                    {eventDay.toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                ),
              },
              event.time || countdown
                ? {
                    icon: Clock,
                    label: 'Horário',
                    value: (
                      <span className="inline-flex items-center gap-2">
                        {event.time || '—'}
                        {countdown && <Badge tone={countdown.tone}>{countdown.label}</Badge>}
                      </span>
                    ),
                  }
                : null,
              churchName ? { icon: Church, label: 'Igreja', value: churchName } : null,
              groupName ? { icon: Music2, label: 'Banda / Grupo', value: groupName } : null,
              event.theme ? { icon: Sparkles, label: 'Tema', value: event.theme } : null,
              event.bibleVerse ? { icon: BookOpen, label: 'Texto bíblico', value: event.bibleVerse } : null,
              event.preacher ? { icon: Mic, label: 'Pregador', value: event.preacher } : null,
              event.leader ? { icon: UserRound, label: 'Dirigente', value: event.leader } : null,
              event.notes
                ? {
                    icon: Info,
                    label: 'Notas',
                    value: <span className="whitespace-pre-line">{event.notes}</span>,
                  }
                : null,
            ]
              .filter((row): row is { icon: typeof Calendar; label: string; value: React.ReactNode } => Boolean(row))
              .map((row) => (
                <div key={row.label} className="flex gap-3">
                  <span className="w-8 h-8 rounded-lg bg-surface-2 text-fg-muted flex items-center justify-center shrink-0">
                    <row.icon className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <dt className="text-[11px] text-fg-muted">{row.label}</dt>
                    <dd className="text-[13px] font-semibold text-fg break-words">{row.value}</dd>
                  </div>
                </div>
              ))}
          </dl>
        </section>
      </aside>
      </div>

      <Modal
        open={isEditEventOpen}
        onClose={() => setIsEditEventOpen(false)}
        title="Editar evento"
        icon={Calendar}
        size="md"
        className="lg:max-w-3xl"
        locked={isSavingEvent}
        footer={
          <>
            <ActionButton variant="light" disabled={isSavingEvent} onClick={() => setIsEditEventOpen(false)}>
              Cancelar
            </ActionButton>
            <ActionButton type="submit" form="event-detail-edit-form" variant="primary" icon={Check} loading={isSavingEvent}>
              {isSavingEvent ? 'Salvando...' : 'Salvar'}
            </ActionButton>
          </>
        }
      >
        <form
          id="event-detail-edit-form"
          onSubmit={handleSaveEventForm}
          className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-4"
        >
          <Field label="Título" required className="col-span-2">
            {(id) => (
              <>
                <Input
                  id={id}
                  required
                  list="event-detail-title-suggestions"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex.: Culto, Escola Bíblica…"
                />
                <datalist id="event-detail-title-suggestions">
                  {EVENT_TITLE_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Data" required>
            {(id) => (
              <Input id={id} type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            )}
          </Field>
          <Field label="Horário">
            {(id) => <Input id={id} type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} />}
          </Field>
          <Field label="Tema" className="col-span-2">
            {(id) => (
              <Input
                id={id}
                value={formTheme}
                onChange={(e) => setFormTheme(e.target.value)}
                placeholder="Ex.: A soberania de Deus"
              />
            )}
          </Field>
          <Field label="Texto bíblico" className="col-span-2">
            {(id) => (
              <Input
                id={id}
                value={formBibleVerse}
                onChange={(e) => setFormBibleVerse(e.target.value)}
                placeholder="Ex.: Salmo 95:1-7"
              />
            )}
          </Field>
          <Field label="Pregador" className="col-span-2">
            {(id) => (
              <Input
                id={id}
                value={formPreacher}
                onChange={(e) => setFormPreacher(e.target.value)}
                placeholder="Ex.: Rev. Marcos Silva"
              />
            )}
          </Field>
          <Field label="Dirigente" className="col-span-2">
            {(id) => (
              <Input
                id={id}
                value={formLeader}
                onChange={(e) => setFormLeader(e.target.value)}
                placeholder="Ex.: Presb. João"
              />
            )}
          </Field>
          <Field label="Banda / Grupo" className="col-span-2 lg:col-span-4">
            {(id) => (
              <Select id={id} value={formGroupId} onChange={(e) => setFormGroupId(e.target.value)}>
                <option value="">Sem grupo</option>
                {musicGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Notas" className="col-span-2 lg:col-span-4">
            {(id) => (
              <Textarea
                id={id}
                rows={2}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Observações para a equipe"
              />
            )}
          </Field>
        </form>
      </Modal>

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
    </PageShell>
  );
};
