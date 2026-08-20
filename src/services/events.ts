import { dbEventToUi } from '@/adapters/eventAdapter';
import { dbLiturgyToUi } from '@/adapters/liturgyAdapter';
import { dbScheduleToWorship } from '@/adapters/scheduleAdapter';
import type { DbEvent, DbLiturgy, DbSchedule } from '@/lib/dbTypes';
import { isUuid } from '@/lib/ids';
import { requireSupabase } from '@/lib/supabase';
import type { ChurchEvent, Liturgy, Setlist, WorshipSchedule } from '@/types';
import {
  getEventSetlist,
  listCustomizationsForEvent,
} from '@/services/eventSongs';

const EVENT_SELECT = `
  *,
  schedules(id, playlist_id),
  liturgies(id),
  event_songs(id)
`;

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function listEvents(orgId: string): Promise<ChurchEvent[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('events')
    .select(EVENT_SELECT)
    .eq('org_id', orgId)
    .order('service_date', { ascending: true });
  if (error) throw error;
  return ((data || []) as DbEvent[]).map(dbEventToUi);
}

export async function getEvent(eventId: string): Promise<ChurchEvent | null> {
  if (!isUuid(eventId)) return null;
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('events')
    .select(EVENT_SELECT)
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return dbEventToUi(data as DbEvent);
}

export interface EventBundle {
  event: ChurchEvent;
  schedule: WorshipSchedule | null;
  liturgy: Liturgy | null;
  setlist: Setlist | null;
}

export async function getEventBundle(eventId: string): Promise<EventBundle | null> {
  const event = await getEvent(eventId);
  if (!event) return null;

  const sb = requireSupabase();

  let liturgy: Liturgy | null = null;
  if (event.liturgyId) {
    const { data, error } = await sb
      .from('liturgies')
      .select(`*, liturgy_items(*)`)
      .eq('id', event.liturgyId)
      .maybeSingle();
    if (error) throw error;
    if (data) liturgy = dbLiturgyToUi(data as DbLiturgy);
  }

  const setlist = await getEventSetlist(eventId, {
    title: `Repertório — ${event.serviceType || event.title} ${event.date}`,
    date: event.date,
    orgId: event.churchId,
    groupId: event.musicGroupId,
  });

  const customSongs = await listCustomizationsForEvent(eventId);
  const songIds = (setlist?.items || []).map((i) => i.songId);

  let schedule: WorshipSchedule | null = null;
  if (event.scheduleId) {
    const { data, error } = await sb
      .from('schedules')
      .select(`*, schedule_assignments(*, profiles(*))`)
      .eq('id', event.scheduleId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      schedule = dbScheduleToWorship(data as DbSchedule, { customSongs, songIds });
    }
  }

  return { event, schedule, liturgy, setlist };
}

async function ensureEventChildren(
  userId: string | undefined,
  event: ChurchEvent,
): Promise<ChurchEvent> {
  const sb = requireSupabase();
  let scheduleId = event.scheduleId;

  if (!scheduleId) {
    const { data, error } = await sb
      .from('schedules')
      .insert({
        org_id: event.churchId,
        event_id: event.id,
        title: event.serviceType || event.title || 'Culto',
        service_date: event.date,
        service_time: event.time ?? null,
        service_type: event.serviceType || event.title || 'Culto',
        theme: event.theme ?? null,
        notes: event.notes ?? null,
        status: 'confirmed',
        playlist_id: null,
        group_id: isUuid(event.musicGroupId) ? event.musicGroupId : null,
        created_by: userId ?? null,
      })
      .select('id')
      .single();
    if (error) throw error;
    scheduleId = data.id as string;
  }

  return {
    ...event,
    scheduleId,
    hasSchedule: true,
  };
}

export async function upsertEvent(
  userId: string | undefined,
  event: ChurchEvent,
  options?: { ensureChildren?: boolean },
): Promise<ChurchEvent> {
  const sb = requireSupabase();
  const ensureChildren = options?.ensureChildren !== false;

  const payload = {
    org_id: event.churchId,
    title: event.title || event.serviceType || 'Culto',
    service_date: event.date,
    service_time: event.time ?? null,
    service_type: event.serviceType ?? event.title ?? null,
    theme: event.theme ?? null,
    notes: event.notes ?? null,
    group_id: isUuid(event.musicGroupId) ? event.musicGroupId : null,
    created_by: userId ?? null,
    updated_at: new Date().toISOString(),
  };

  let eventId = event.id;
  if (isUuid(eventId)) {
    const { error } = await sb.from('events').update(payload).eq('id', eventId);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from('events').insert(payload).select('id').single();
    if (error) throw error;
    eventId = data.id as string;
  }

  let saved = await getEvent(eventId);
  if (!saved) throw new Error('Evento não encontrado após salvar.');

  if (ensureChildren) {
    saved = await ensureEventChildren(userId, saved);
    saved = (await getEvent(eventId)) || saved;
  }

  return saved;
}

export async function upsertEventBatch(
  userId: string | undefined,
  event: ChurchEvent,
  count: number,
  intervalDays: number,
): Promise<ChurchEvent[]> {
  const safeCount = Math.min(52, Math.max(1, Math.floor(count)));
  const safeInterval = Math.min(365, Math.max(1, Math.floor(intervalDays)));
  const created: ChurchEvent[] = [];

  for (let i = 0; i < safeCount; i++) {
    const date = addDaysToDateStr(event.date, i * safeInterval);
    const item = await upsertEvent(userId, {
      ...event,
      id: '',
      date,
      createdAt: new Date().toISOString(),
    });
    created.push(item);
  }

  return created;
}

export async function deleteEvent(id: string): Promise<void> {
  if (!isUuid(id)) throw new Error('Id de evento inválido.');
  const sb = requireSupabase();
  const { error } = await sb.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function ensureEventLiturgy(
  userId: string | undefined,
  event: ChurchEvent,
): Promise<Liturgy> {
  const bundle = await getEventBundle(event.id);
  if (bundle?.liturgy) return bundle.liturgy;

  const sb = requireSupabase();
  const { data, error } = await sb
    .from('liturgies')
    .insert({
      org_id: event.churchId,
      event_id: event.id,
      title: event.serviceType || event.title || 'Culto',
      service_date: event.date,
      theme: event.theme ?? null,
      created_by: userId ?? null,
    })
    .select('*, liturgy_items(*)')
    .single();
  if (error) throw error;
  return dbLiturgyToUi(data as DbLiturgy);
}
