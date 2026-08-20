import { dbScheduleToWorship } from '@/adapters/scheduleAdapter';
import type { DbSchedule } from '@/lib/dbTypes';
import { isUuid } from '@/lib/ids';
import { requireSupabase } from '@/lib/supabase';
import type { WorshipSchedule } from '@/types';
import {
  listCustomizationsForEvent,
  listForEvent,
} from '@/services/eventSongs';

const SCHEDULE_SELECT = `
  *,
  schedule_assignments(*, profiles(*))
`;

async function withEventRepertoire(schedule: DbSchedule): Promise<WorshipSchedule> {
  const eventId = schedule.event_id;
  if (!eventId) return dbScheduleToWorship(schedule);

  const [versions, customSongs] = await Promise.all([
    listForEvent(eventId),
    listCustomizationsForEvent(eventId),
  ]);

  return dbScheduleToWorship(schedule, {
    songIds: versions.map((v) => v.songId),
    customSongs,
  });
}

export async function listSchedules(orgId: string): Promise<WorshipSchedule[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('schedules')
    .select(SCHEDULE_SELECT)
    .eq('org_id', orgId)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return Promise.all(((data || []) as DbSchedule[]).map(withEventRepertoire));
}

export async function listSchedulesForOrgs(orgIds: string[]): Promise<WorshipSchedule[]> {
  if (!orgIds.length) return [];
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('schedules')
    .select(SCHEDULE_SELECT)
    .in('org_id', orgIds)
    .order('service_date', { ascending: false });
  if (error) throw error;
  return Promise.all(((data || []) as DbSchedule[]).map(withEventRepertoire));
}

async function syncAssignments(scheduleId: string, schedule: WorshipSchedule): Promise<void> {
  const sb = requireSupabase();
  await sb.from('schedule_assignments').delete().eq('schedule_id', scheduleId);
  if (!schedule.assignments?.length) return;
  const { error } = await sb.from('schedule_assignments').insert(
    schedule.assignments.map((a, index) => ({
      schedule_id: scheduleId,
      role_label: a.role,
      user_id: isUuid(a.userId) ? a.userId : null,
      person_name: a.memberName,
      sort_order: index,
      availability_status: a.status || 'pending',
      decline_reason: a.declineReason ?? null,
    })),
  );
  if (error) throw error;
}

export async function upsertSchedule(
  userId: string | undefined,
  schedule: WorshipSchedule,
): Promise<WorshipSchedule> {
  const sb = requireSupabase();

  const existingId = isUuid(schedule.id) ? schedule.id : null;
  const eventId = isUuid(schedule.eventId) ? schedule.eventId : null;
  if (!eventId) {
    throw new Error('Escala precisa estar vinculada a um evento.');
  }

  const payload = {
    org_id: schedule.churchId,
    event_id: eventId,
    title: schedule.serviceType || 'Culto',
    service_date: schedule.date,
    service_time: schedule.time ?? null,
    service_type: schedule.serviceType,
    theme: schedule.theme ?? null,
    rehearsal_date: schedule.rehearsalDate || null,
    rehearsal_time: schedule.rehearsalTime ?? null,
    notes: schedule.notes ?? null,
    status: schedule.status,
    is_finalized: Boolean(schedule.isFinalized),
    finalized_at: schedule.finalizedAt ?? null,
    finalized_by: isUuid(schedule.finalizedBy) ? schedule.finalizedBy : userId ?? null,
    playlist_id: null,
    group_id: isUuid(schedule.musicGroupId) ? schedule.musicGroupId : null,
    created_by: userId ?? null,
  };

  let scheduleId: string;
  if (existingId) {
    const { error } = await sb.from('schedules').update(payload).eq('id', existingId);
    if (error) throw error;
    scheduleId = existingId;
  } else {
    const { data, error } = await sb.from('schedules').insert(payload).select('id').single();
    if (error) throw error;
    scheduleId = data.id as string;
  }

  if (!isUuid(scheduleId)) {
    throw new Error('Falha ao obter id da escala no banco.');
  }

  await syncAssignments(scheduleId, {
    ...schedule,
    assignments: (schedule.assignments || []).map((a) => ({
      ...a,
      userId: isUuid(a.userId) ? a.userId : undefined,
      memberId: isUuid(a.memberId) ? a.memberId : undefined,
    })),
  });

  const { data, error } = await sb
    .from('schedules')
    .select(SCHEDULE_SELECT)
    .eq('id', scheduleId)
    .single();
  if (error) throw error;
  return withEventRepertoire(data as DbSchedule);
}

export async function deleteSchedule(id: string): Promise<void> {
  if (!isUuid(id)) {
    throw new Error('Id de escala inválido.');
  }
  const sb = requireSupabase();
  const { error } = await sb.from('schedules').delete().eq('id', id);
  if (error) throw error;
}
