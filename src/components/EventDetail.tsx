import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
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
  Music,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  Users,
  X,
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
import { normalizeShareSlug, validateShareSlug } from '@/lib/shareSlug';
import {
  eventShareUrl,
  updateEventShareSettings,
} from '@/services/eventShare';
import { ScheduleManager } from './ScheduleManager';
import { LiturgyManager } from './LiturgyManager';
import { AddSongsToEventSetlistModal } from './AddSongsToEventSetlistModal';
import { ScheduleSongEditorModal } from './ScheduleSongEditorModal';
import { EVENT_TITLE_SUGGESTIONS } from '../constants/eventTitles';

type EventTab = 'team' | 'liturgy' | 'setlist';

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
  canManageTeam: boolean;
  canManageLiturgy: boolean;
  canManageSetlist: boolean;
  onBack: () => void;
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
}

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  schedule,
  liturgy,
  setlist,
  songs,
  musicGroups,
  systemUsers = [],
  canManageTeam,
  canManageLiturgy,
  canManageSetlist,
  onBack,
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
  const [tab, setTab] = useState<EventTab>('team');
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
      setTab(canManageLiturgy ? 'liturgy' : 'setlist');
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
        name: 'Igreja ativa',
        city: '',
        createdAt: event.createdAt,
      },
    ],
    [event.churchId, event.createdAt],
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

  const tabs: { id: EventTab; label: string; icon: React.ComponentType<{ className?: string }>; show: boolean }[] = [
    { id: 'team', label: 'Equipe de louvor', icon: Users, show: canManageTeam },
    { id: 'liturgy', label: 'Liturgia', icon: FileText, show: canManageLiturgy },
    { id: 'setlist', label: 'Repertório', icon: ListMusic, show: true },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-emerald-300 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao calendário
          </button>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
              {event.time ? ` · ${event.time}` : ''}
            </span>
          </div>
          <h1 className="text-2xl xl:text-3xl font-display font-bold text-stone-100 mt-1">
            {event.title}
          </h1>
          {event.theme && (
            <p className="text-sm text-stone-400 mt-1">Tema: {event.theme}</p>
          )}
        </div>
        <div className="shrink-0 self-start sm:mt-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSharePanelOpen((v) => !v)}
            className={`px-3 py-2 rounded-button text-xs font-semibold border inline-flex items-center gap-1.5 ${
              shareEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-700/50'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border-stone-700'
            }`}
            title="Compartilhar evento"
          >
            <Share2 className="w-3.5 h-3.5" />
            Compartilhar
          </button>
          {onSaveEvent && (
            <button
              type="button"
              onClick={openEditEvent}
              className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-button text-xs font-semibold border border-stone-700 inline-flex items-center gap-1.5"
              title="Editar evento"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              Editar evento
            </button>
          )}
        </div>
      </div>

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
            <button
              type="button"
              disabled={shareSaving}
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
              className={`px-3 py-1.5 rounded-button text-[11px] font-bold border inline-flex items-center gap-1.5 ${
                shareEnabled
                  ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                  : 'bg-stone-950 text-stone-300 border-stone-700'
              }`}
            >
              {shareEnabled ? (
                <>
                  <Globe className="w-3.5 h-3.5" /> Ativo
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" /> Desativado
                </>
              )}
            </button>
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
            <button
              type="button"
              disabled={shareSaving}
              onClick={saveShareLinkDetails}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-button text-[11px] font-semibold text-stone-200"
            >
              Salvar nome e validade
            </button>
            <button
              type="button"
              disabled={shareSaving}
              onClick={() =>
                setShareExpiresLocal(suggestedShareExpiryLocal(event.date, event.time))
              }
              className="px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Usar sugestão (+1 dia)
            </button>
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
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      eventShareUrl(event.shareCode || activeShareCode),
                    );
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-button text-[11px] font-semibold inline-flex items-center gap-1.5"
                >
                  {shareCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copiar link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = eventShareUrl(event.shareCode || activeShareCode);
                    const text = `📅 *${event.title}*\n🔗 ${url}\n\n✨ LouvorHub`;
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(text)}`,
                      '_blank',
                      'noopener,noreferrer',
                    );
                  }}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-button text-[11px] font-bold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </button>
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

      <div className="flex flex-wrap gap-1 bg-stone-950 border border-stone-800 p-1 rounded-xl w-fit">
        {tabs
          .filter((t) => t.show)
          .map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-button text-xs font-bold flex items-center gap-2 transition-all ${
                  tab === t.id
                    ? 'bg-emerald-500 text-stone-950'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
      </div>

      {tab === 'team' && canManageTeam && (
        <div className="w-full space-y-4">
          {!scheduleForEvent ? (
            <div className="text-center py-10 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              <Users className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <p className="text-sm text-stone-300 font-semibold mb-3">
                Ainda não há escala neste evento
              </p>
              <button
                type="button"
                onClick={() => ensureTeamSchedule()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar equipe de louvor
              </button>
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
        <div className="w-full space-y-4">
          {!liturgy ? (
            <div className="text-center py-10 bg-stone-900/40 rounded-2xl border border-dashed border-stone-800">
              <FileText className="w-10 h-10 text-stone-600 mx-auto mb-3" />
              <p className="text-sm text-stone-300 font-semibold mb-3">
                Ainda não há liturgia neste evento
              </p>
              <button
                type="button"
                onClick={() => onEnsureLiturgy()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Criar liturgia
              </button>
            </div>
          ) : (
            <LiturgyManager
              liturgies={[
                {
                  ...liturgy,
                  eventId: event.id,
                  churchId: event.churchId,
                  date: liturgy.date || event.date,
                },
              ]}
              churches={churchStub}
              songs={songs}
              activeChurchId={event.churchId}
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
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-md w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              Músicas do evento ({setlistItems.length})
            </h3>
            {canManageSetlist && setlist && (
              <button
                type="button"
                onClick={() => setAddSongsOpen(true)}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar ao repertório
              </button>
            )}
          </div>

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
                <button
                  type="button"
                  onClick={() => setAddSongsOpen(true)}
                  className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-emerald-300 font-semibold rounded-button text-xs inline-flex items-center gap-1.5 border border-stone-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar músicas
                </button>
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
                        ? 'bg-emerald-950/30 border-emerald-800/50'
                        : 'bg-stone-950/60 border-stone-800'
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
                      className="text-left text-xs text-stone-200 truncate flex-1 min-w-0"
                    >
                      <span className="text-emerald-400 font-mono mr-1.5">
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
                    <div className="flex items-center gap-1 shrink-0">
                      {canManageSetlist && song && (
                        <button
                          type="button"
                          onClick={() => requestVersionForEvent(song, isCustomized)}
                          className={`px-2.5 py-1.5 rounded-button text-[11px] font-bold inline-flex items-center gap-1 border transition-colors ${
                            isCustomized
                              ? 'bg-stone-800 text-emerald-300 border-stone-700 hover:border-emerald-700/50'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-700/40 hover:bg-emerald-500/25'
                          }`}
                          title={
                            isCustomized
                              ? 'Editar versão deste evento'
                              : 'Criar versão exclusiva para o evento'
                          }
                        >
                          {isCustomized ? (
                            <Edit3 className="w-3.5 h-3.5" />
                          ) : (
                            <CopyPlus className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isCustomized ? 'Editar versão' : 'Criar versão'}
                          </span>
                        </button>
                      )}
                      {canManageSetlist && (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-stone-500 hover:text-rose-400 rounded-button"
                          title="Remover do repertório"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {isEditEventOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
            <div className="p-5 border-b border-stone-800 flex items-center justify-between shrink-0">
              <h3 className="text-lg font-display font-bold text-stone-100">Editar Evento</h3>
              <button
                type="button"
                onClick={() => setIsEditEventOpen(false)}
                className="text-stone-400 hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
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
                <button
                  type="button"
                  disabled={isSavingEvent}
                  onClick={() => setIsEditEventOpen(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs disabled:opacity-50"
                >
                  {isSavingEvent ? 'Salvando...' : 'Salvar'}
                </button>
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
              <button
                type="button"
                onClick={() => setVersionConfirmSong(null)}
                className="p-1.5 text-stone-400 hover:text-stone-100 rounded-button"
              >
                <X className="w-4 h-4" />
              </button>
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
                <button
                  type="button"
                  onClick={() => setVersionConfirmSong(null)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-button text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => openVersionEditor(versionConfirmSong)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold rounded-button text-xs inline-flex items-center gap-1.5"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                  Continuar
                </button>
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
