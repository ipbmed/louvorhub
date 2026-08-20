import { dbEventSongToUi, dbSongToSong } from '@/adapters/songAdapter';
import type { DbEventSong, DbEventSongVersion, DbSong } from '@/lib/dbTypes';
import { isUuid } from '@/lib/ids';
import { validateSongVersionFields } from '@/lib/songVersionFields';
import { requireSupabase } from '@/lib/supabase';
import { applySongCustomization } from '@/utils/applySongCustomization';
import type { EventSong, ScheduleSongCustomization, Setlist, SetlistItem, Song } from '@/types';

const EVENT_SONG_SELECT = '*, event_songs_version(*)';

function versionOf(row: DbEventSong): DbEventSongVersion | null {
  const raw = row.event_songs_version;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] || null : raw;
}

function toCustomization(row: DbEventSong): ScheduleSongCustomization | null {
  const v = versionOf(row);
  if (!v) return null;
  return {
    songId: row.song_id,
    eventSongId: row.id,
    originalKey: v.musical_key ?? undefined,
    bpm: v.bpm != null ? String(v.bpm) : undefined,
    timeSignature: v.time_signature ?? undefined,
    lyrics: v.lyrics_md || undefined,
    notes: v.instructions ?? undefined,
    isCustomized: true,
  };
}

/** Lista músicas do repertório de um evento (ordenadas). */
export async function listForEvent(eventId: string): Promise<EventSong[]> {
  if (!isUuid(eventId)) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('event_songs')
    .select(EVENT_SONG_SELECT)
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return ((data || []) as DbEventSong[]).map(dbEventSongToUi);
}

/** Monta um Setlist virtual a partir de event_songs (UI). */
export async function getEventSetlist(eventId: string, meta?: {
  title?: string;
  date?: string;
  orgId?: string;
  groupId?: string | null;
}): Promise<Setlist | null> {
  if (!isUuid(eventId)) return null;
  const rows = await listForEvent(eventId);
  const items: SetlistItem[] = rows.map((v) => ({
    id: v.id,
    songId: v.songId,
    customKey: v.originalKey,
    notes: v.instructions,
  }));

  return {
    id: eventId,
    title: meta?.title || 'Repertório',
    date: meta?.date || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    orgId: meta?.orgId,
    groupId: meta?.groupId,
    eventId,
    visibility: 'private',
    kind: 'group_schedule',
    canEdit: true,
    items,
  };
}

export async function listCustomizationsForEvent(
  eventId: string,
): Promise<ScheduleSongCustomization[]> {
  if (!isUuid(eventId)) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('event_songs')
    .select(EVENT_SONG_SELECT)
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const rows = (data || []) as DbEventSong[];
  return rows
    .map((row) => toCustomization(row))
    .filter((c): c is ScheduleSongCustomization => Boolean(c));
}

const SONG_SELECT = `
  *,
  hymnals(*),
  song_links(*)
`;

export interface EventSongVersionView {
  song: Song;
  event: {
    id: string;
    title: string;
    date: string;
    time?: string | null;
  };
  eventSongId: string;
}

/** Carrega a música do catálogo com a versão do item do repertório aplicada. */
export async function getSongForVersion(eventSongId: string): Promise<EventSongVersionView> {
  if (!isUuid(eventSongId)) throw new Error('Versão inválida.');
  const sb = requireSupabase();
  const { data: eventSong, error: esErr } = await sb
    .from('event_songs')
    .select(`
      *,
      event_songs_version(*),
      events(id, title, service_date, service_time)
    `)
    .eq('id', eventSongId)
    .maybeSingle();
  if (esErr) throw esErr;
  if (!eventSong) throw new Error('Versão não encontrada.');

  const row = eventSong as DbEventSong & {
    events?: {
      id: string;
      title: string;
      service_date: string;
      service_time: string | null;
    } | null;
  };
  const custom = toCustomization(row);
  if (!custom) throw new Error('Esta música do repertório não possui versão própria.');

  const event = row.events;
  if (!event?.id) throw new Error('Evento da versão não encontrado.');

  const { data: songRow, error: songErr } = await sb
    .from('songs')
    .select(SONG_SELECT)
    .eq('id', row.song_id)
    .maybeSingle();
  if (songErr) throw songErr;
  if (!songRow) throw new Error('Música não encontrada.');

  return {
    song: applySongCustomization(dbSongToSong(songRow as unknown as DbSong), custom),
    event: {
      id: event.id,
      title: event.title,
      date: event.service_date,
      time: event.service_time,
    },
    eventSongId,
  };
}

/** Substitui a lista de músicas do repertório do evento. */
export async function replaceEventSongs(
  eventId: string,
  songIds: string[],
): Promise<Setlist> {
  if (!isUuid(eventId)) throw new Error('Evento inválido.');
  const sb = requireSupabase();
  const ids = songIds.filter((id) => isUuid(id));

  const { data: existing, error: existingErr } = await sb
    .from('event_songs')
    .select('id, song_id, sort_order')
    .eq('event_id', eventId);
  if (existingErr) throw existingErr;

  const bySong = new Map(
    ((existing || []) as DbEventSong[]).map((row) => [row.song_id, row]),
  );

  const keep = new Set(ids);
  const toDelete = ((existing || []) as DbEventSong[])
    .filter((row) => !keep.has(row.song_id))
    .map((row) => row.id);
  if (toDelete.length) {
    // cascade remove event_songs_version
    const { error } = await sb.from('event_songs').delete().in('id', toDelete);
    if (error) throw error;
  }

  for (let index = 0; index < ids.length; index++) {
    const songId = ids[index];
    const prev = bySong.get(songId);
    if (prev) {
      const { error } = await sb
        .from('event_songs')
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq('id', prev.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('event_songs').insert({
        event_id: eventId,
        song_id: songId,
        sort_order: index,
      });
      if (error) throw error;
    }
  }

  const setlist = await getEventSetlist(eventId);
  if (!setlist) throw new Error('Falha ao montar repertório do evento.');
  return setlist;
}

export async function upsertEventRepertoireFromSetlist(setlist: Setlist): Promise<Setlist> {
  if (!setlist.eventId || !isUuid(setlist.eventId)) {
    throw new Error('Repertório de evento exige eventId.');
  }
  const saved = await replaceEventSongs(
    setlist.eventId,
    (setlist.items || []).map((i) => i.songId),
  );
  return {
    ...saved,
    title: setlist.title || saved.title,
    date: setlist.date || saved.date,
    orgId: setlist.orgId || saved.orgId,
    groupId: setlist.groupId ?? saved.groupId,
  };
}

/** Cria/atualiza a versão customizada em event_songs_version. */
export async function upsertEventSongVersion(params: {
  eventId: string;
  customization: ScheduleSongCustomization;
}): Promise<EventSong> {
  const { eventId, customization } = params;
  if (!isUuid(eventId) || !isUuid(customization.songId)) {
    throw new Error('Evento ou música inválidos.');
  }
  const sb = requireSupabase();
  const validated = validateSongVersionFields({
    lyrics: customization.lyrics ?? '',
    bpm: customization.bpm != null ? String(customization.bpm) : '',
    timeSignature: customization.timeSignature ?? '',
    key: customization.originalKey ?? '',
  });
  if (validated.ok === false) {
    throw new Error(validated.message);
  }
  const bpm = validated.bpm != null ? Number(validated.bpm) : null;

  const { data: eventSong, error: esErr } = await sb
    .from('event_songs')
    .select('id, sort_order, event_id, song_id')
    .eq('event_id', eventId)
    .eq('song_id', customization.songId)
    .maybeSingle();
  if (esErr) throw esErr;

  let eventSongId = eventSong?.id as string | undefined;
  if (!eventSongId) {
    const { data: maxOrder } = await sb
      .from('event_songs')
      .select('sort_order')
      .eq('event_id', eventId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxOrder?.sort_order ?? -1) + 1;
    const { data: created, error: createErr } = await sb
      .from('event_songs')
      .insert({
        event_id: eventId,
        song_id: customization.songId,
        sort_order: nextOrder,
      })
      .select('id, sort_order, event_id, song_id')
      .single();
    if (createErr) throw createErr;
    eventSongId = created.id as string;
  }

  const versionPayload = {
    event_songs_id: eventSongId,
    lyrics_md: validated.lyrics,
    musical_key: validated.key ?? null,
    bpm,
    time_signature: validated.timeSignature ?? null,
    instructions: customization.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: verErr } = await sb
    .from('event_songs_version')
    .upsert(versionPayload, { onConflict: 'event_songs_id' });
  if (verErr) throw verErr;

  const { data, error } = await sb
    .from('event_songs')
    .select(EVENT_SONG_SELECT)
    .eq('id', eventSongId)
    .single();
  if (error) throw error;
  return dbEventSongToUi(data as DbEventSong);
}

/** Remove a versão customizada (volta ao catálogo; mantém no repertório). */
export async function resetEventSongVersion(
  eventId: string,
  songId: string,
): Promise<void> {
  if (!isUuid(eventId) || !isUuid(songId)) return;
  const sb = requireSupabase();
  const { data: eventSong, error: esErr } = await sb
    .from('event_songs')
    .select('id')
    .eq('event_id', eventId)
    .eq('song_id', songId)
    .maybeSingle();
  if (esErr) throw esErr;
  if (!eventSong?.id) return;

  const { error } = await sb
    .from('event_songs_version')
    .delete()
    .eq('event_songs_id', eventSong.id);
  if (error) throw error;
}

/** @deprecated use upsertEventSongVersion */
export async function upsertRepertoireSongVersion(params: {
  eventId: string;
  customization: ScheduleSongCustomization;
}): Promise<EventSong> {
  return upsertEventSongVersion(params);
}

/** @deprecated use resetEventSongVersion */
export async function resetRepertoireSongVersion(
  eventId: string,
  songId: string,
): Promise<void> {
  await resetEventSongVersion(eventId, songId);
}

export function eventSongToCustomization(v: EventSong): ScheduleSongCustomization {
  return {
    songId: v.songId,
    eventSongId: v.hasVersion ? v.id : undefined,
    originalKey: v.originalKey,
    bpm: v.bpm != null ? String(v.bpm) : undefined,
    timeSignature: v.timeSignature,
    lyrics: v.lyrics,
    notes: v.instructions,
    isCustomized: Boolean(v.hasVersion),
  };
}

/** @deprecated use eventSongToCustomization */
export const songVersionToCustomization = eventSongToCustomization;
