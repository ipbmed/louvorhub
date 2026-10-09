import React, { useMemo, useState } from 'react';
import { AlertTriangle, ListMusic, FileText, Plus } from 'lucide-react';
import type { Liturgy, LiturgyItem, Setlist, Song } from '@/types';
import { ActionButton } from './ui';

function songLabel(song: Song | undefined): string {
  if (!song) return 'Música';
  if (song.songType === 'hino' && song.number != null) return `#${song.number} ${song.title}`;
  return song.title;
}

export function liturgyLinkedSongIds(liturgy: Liturgy | null): string[] {
  if (!liturgy) return [];
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of liturgy.items) {
    if (item.type !== 'hymn' || !item.songId || seen.has(item.songId)) continue;
    seen.add(item.songId);
    ids.push(item.songId);
  }
  return ids;
}

export function getLiturgySetlistDiff(liturgy: Liturgy | null, setlist: Setlist | null) {
  const liturgySongIds = liturgyLinkedSongIds(liturgy);
  const setlistSongIds = (setlist?.items || []).map((i) => i.songId);
  return {
    liturgySongIds,
    setlistSongIds,
    /** Na liturgia, ainda não estão no repertório */
    missingInSetlist: liturgySongIds.filter((id) => !setlistSongIds.includes(id)),
    /** No repertório, ainda não estão na liturgia */
    missingInLiturgy: setlistSongIds.filter((id) => !liturgySongIds.includes(id)),
  };
}

interface EventLiturgySetlistSyncProps {
  /** Em cada aba mostra só a pendência relevante. */
  scope: 'liturgy' | 'setlist';
  liturgy: Liturgy | null;
  setlist: Setlist | null;
  songs: Song[];
  canManageLiturgy: boolean;
  canManageSetlist: boolean;
  onSaveLiturgy: (liturgy: Liturgy) => void | Promise<void>;
  onSaveSetlist: (setlist: Setlist) => void | Promise<void>;
  onEnsureLiturgy?: () => void | Promise<void>;
  eventId: string;
  eventTitle: string;
  eventDate: string;
}

export const EventLiturgySetlistSync: React.FC<EventLiturgySetlistSyncProps> = ({
  scope,
  liturgy,
  setlist,
  songs,
  canManageLiturgy,
  canManageSetlist,
  onSaveLiturgy,
  onSaveSetlist,
  onEnsureLiturgy,
  eventId,
  eventTitle,
  eventDate,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const { missingInSetlist, missingInLiturgy, setlistSongIds } = useMemo(
    () => getLiturgySetlistDiff(liturgy, setlist),
    [liturgy, setlist],
  );

  const needsLiturgy = Boolean(
    scope === 'liturgy' && !liturgy && setlistSongIds.length > 0,
  );
  const showSetlistPendencies = scope === 'setlist' && missingInSetlist.length > 0;
  const showLiturgyPendencies =
    scope === 'liturgy' && (missingInLiturgy.length > 0 || needsLiturgy);

  if (!showSetlistPendencies && !showLiturgyPendencies) {
    return null;
  }

  const resolveSetlist = (): Setlist => {
    if (setlist) return setlist;
    return {
      id: eventId,
      title: `Repertório — ${eventTitle}`,
      date: eventDate,
      createdAt: new Date().toISOString(),
      eventId,
      visibility: 'private',
      kind: 'group_schedule',
      canEdit: true,
      items: [],
    };
  };

  const addToSetlist = async (songIds: string[]) => {
    if (!canManageSetlist || !songIds.length) return;
    const base = resolveSetlist();
    const existing = new Set(base.items.map((i) => i.songId));
    const toAdd = songIds.filter((id) => !existing.has(id));
    if (!toAdd.length) return;
    const key = toAdd.length > 1 ? 'all-setlist' : toAdd[0];
    try {
      setBusyId(key);
      await onSaveSetlist({
        ...base,
        eventId,
        kind: 'group_schedule',
        date: eventDate,
        title: base.title || `Repertório — ${eventTitle}`,
        items: [
          ...base.items,
          ...toAdd.map((songId, i) => ({
            id: `item-sync-${Date.now()}-${i}-${songId.slice(0, 8)}`,
            songId,
          })),
        ],
      });
    } finally {
      setBusyId(null);
    }
  };

  const addToLiturgy = async (songIds: string[]) => {
    if (!liturgy || !canManageLiturgy || !songIds.length) return;
    const existing = new Set(
      liturgy.items.filter((i) => i.songId).map((i) => i.songId as string),
    );
    const toAdd = songIds.filter((id) => !existing.has(id));
    if (!toAdd.length) return;
    const maxOrder = liturgy.items.reduce((m, i) => Math.max(m, i.order), 0);
    const newItems: LiturgyItem[] = toAdd.map((songId, i) => {
      const song = songs.find((s) => s.id === songId);
      return {
        id: `li-sync-${Date.now()}-${i}-${songId.slice(0, 8)}`,
        order: maxOrder + i + 1,
        type: 'hymn',
        title: song?.title || 'Música',
        songId,
        duration: '5 min',
      };
    });
    const key = toAdd.length > 1 ? 'all-liturgy' : toAdd[0];
    try {
      setBusyId(key);
      await onSaveLiturgy({
        ...liturgy,
        items: [...liturgy.items, ...newItems],
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-amber-950/30 light:bg-amber-50 border border-amber-800/50 light:border-amber-200 rounded-2xl p-3 sm:p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 light:text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-amber-100 light:text-amber-900">
            {scope === 'setlist'
              ? 'Músicas da liturgia ausentes no repertório'
              : 'Músicas do repertório ausentes na liturgia'}
          </p>
          <p className="text-[11px] text-amber-200/70 light:text-amber-800/80 mt-0.5 leading-relaxed">
            {scope === 'setlist'
              ? 'O liturgo vinculou músicas que ainda não estão neste repertório.'
              : 'O grupo de louvor tem músicas que ainda não aparecem na ordem do culto.'}
          </p>
        </div>
      </div>

      {needsLiturgy && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-950/40 light:bg-white/70 border border-amber-800/30 light:border-amber-200 px-3 py-2">
          <p className="text-[11px] text-stone-300 light:text-stone-700">
            Há {setlistSongIds.length} música(s) no repertório, mas a liturgia ainda não foi
            criada.
          </p>
          {canManageLiturgy && onEnsureLiturgy && (
            <ActionButton variant="primary" icon={FileText} onClick={() => void onEnsureLiturgy()}>
              Criar liturgia
            </ActionButton>
          )}
        </div>
      )}

      {showSetlistPendencies && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-stone-200 light:text-stone-800 inline-flex items-center gap-1.5">
              <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
              Pendentes ({missingInSetlist.length})
            </p>
            {canManageSetlist && missingInSetlist.length > 1 && (
              <ActionButton
                variant="primary"
                icon={Plus}
                loading={busyId === 'all-setlist'}
                onClick={() => void addToSetlist(missingInSetlist)}
              >
                Adicionar todas
              </ActionButton>
            )}
          </div>
          <ul className="space-y-1.5">
            {missingInSetlist.map((songId) => {
              const song = songs.find((s) => s.id === songId);
              return (
                <li
                  key={`set-${songId}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-stone-950/50 light:bg-white/80 border border-stone-800 light:border-stone-200 px-2.5 py-1.5"
                >
                  <span className="text-[11px] text-stone-200 light:text-stone-800 truncate min-w-0">
                    {songLabel(song)}
                  </span>
                  {canManageSetlist ? (
                    <ActionButton
                      variant="secondary"
                      icon={Plus}
                      loading={busyId === songId}
                      disabled={busyId === 'all-setlist'}
                      onClick={() => void addToSetlist([songId])}
                    >
                      Adicionar
                    </ActionButton>
                  ) : (
                    <span className="text-[10px] text-stone-500 shrink-0">Sem permissão</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {scope === 'liturgy' && liturgy && missingInLiturgy.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold text-stone-200 light:text-stone-800 inline-flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Pendentes ({missingInLiturgy.length})
            </p>
            {canManageLiturgy && missingInLiturgy.length > 1 && (
              <ActionButton
                variant="primary"
                icon={Plus}
                loading={busyId === 'all-liturgy'}
                onClick={() => void addToLiturgy(missingInLiturgy)}
              >
                Incluir todas
              </ActionButton>
            )}
          </div>
          <ul className="space-y-1.5">
            {missingInLiturgy.map((songId) => {
              const song = songs.find((s) => s.id === songId);
              return (
                <li
                  key={`lit-${songId}`}
                  className="flex items-center justify-between gap-2 rounded-xl bg-stone-950/50 light:bg-white/80 border border-stone-800 light:border-stone-200 px-2.5 py-1.5"
                >
                  <span className="text-[11px] text-stone-200 light:text-stone-800 truncate min-w-0">
                    {songLabel(song)}
                  </span>
                  {canManageLiturgy ? (
                    <ActionButton
                      variant="secondary"
                      icon={Plus}
                      loading={busyId === songId}
                      disabled={busyId === 'all-liturgy'}
                      onClick={() => void addToLiturgy([songId])}
                    >
                      Incluir
                    </ActionButton>
                  ) : (
                    <span className="text-[10px] text-stone-500 shrink-0">Sem permissão</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
