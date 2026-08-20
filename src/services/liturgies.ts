import { dbLiturgyToUi, toDbLiturgyItemType } from '@/adapters/liturgyAdapter';
import type { DbLiturgy } from '@/lib/dbTypes';
import { isUuid } from '@/lib/ids';
import { requireSupabase } from '@/lib/supabase';
import type { Liturgy } from '@/types';

const LITURGY_SELECT = `*, liturgy_items(*)`;

export async function listLiturgies(orgId: string): Promise<Liturgy[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('liturgies')
    .select(LITURGY_SELECT)
    .eq('org_id', orgId)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return ((data || []) as DbLiturgy[]).map(dbLiturgyToUi);
}

export async function listLiturgiesForOrgs(orgIds: string[]): Promise<Liturgy[]> {
  if (!orgIds.length) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('liturgies')
    .select(LITURGY_SELECT)
    .in('org_id', orgIds)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return ((data || []) as DbLiturgy[]).map(dbLiturgyToUi);
}

export async function upsertLiturgy(
  userId: string | undefined,
  liturgy: Liturgy,
): Promise<Liturgy> {
  const sb = requireSupabase();
  const payload = {
    org_id: liturgy.churchId,
    event_id: isUuid(liturgy.eventId) ? liturgy.eventId : null,
    title: liturgy.serviceTitle,
    service_date: liturgy.date || null,
    notes: null as string | null,
    theme: liturgy.theme ?? null,
    bible_verse: liturgy.bibleVerse ?? null,
    preacher: liturgy.preacher ?? null,
    leader: liturgy.leader ?? null,
    created_by: userId ?? null,
  };

  let liturgyId = liturgy.id;
  if (isUuid(liturgyId)) {
    const { error } = await sb.from('liturgies').update(payload).eq('id', liturgyId);
    if (error) throw error;
  } else {
    const { data, error } = await sb.from('liturgies').insert(payload).select('id').single();
    if (error) throw error;
    liturgyId = data.id;
  }

  await sb.from('liturgy_items').delete().eq('liturgy_id', liturgyId);
  if (liturgy.items?.length) {
    const { error } = await sb.from('liturgy_items').insert(
      liturgy.items.map((item) => ({
        liturgy_id: liturgyId,
        item_type: toDbLiturgyItemType(item.type),
        item_kind: item.type,
        title: item.title,
        body: item.details ?? null,
        song_id: item.songId ?? null,
        sort_order: item.order,
        responsible: item.responsible ?? null,
        duration: item.duration ?? null,
      })),
    );
    if (error) throw error;
  }

  const { data, error } = await sb
    .from('liturgies')
    .select(LITURGY_SELECT)
    .eq('id', liturgyId)
    .single();
  if (error) throw error;
  return dbLiturgyToUi(data as DbLiturgy);
}

export async function deleteLiturgy(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('liturgies').delete().eq('id', id);
  if (error) throw error;
}
