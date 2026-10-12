import type { DbSchedule } from '@/lib/dbTypes';
import type { ScheduleSongCustomization, WorshipSchedule } from '@/types';

export function dbScheduleToWorship(
  s: DbSchedule,
  options?: { customSongs?: ScheduleSongCustomization[]; songIds?: string[] },
): WorshipSchedule {
  const ev = s.events;
  return {
    id: s.id,
    churchId: s.org_id,
    eventId: s.event_id,
    musicGroupId: s.group_id ?? undefined,
    date: ev?.service_date ?? '',
    time: ev?.service_time ?? undefined,
    serviceType: ev?.service_type || ev?.title || 'Culto',
    theme: ev?.theme ?? undefined,
    rehearsalDate: s.rehearsal_date ?? undefined,
    rehearsalTime: s.rehearsal_time ?? undefined,
    assignments: [...(s.schedule_assignments || [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((a) => ({
        id: a.id,
        userId: a.user_id ?? undefined,
        role: a.role_label,
        memberName: a.person_name || a.profiles?.display_name || 'Integrante',
        status: a.availability_status,
        declineReason: a.decline_reason ?? undefined,
        updatedAt: a.updated_at,
      })),
    songIds: options?.songIds || [],
    customSongs: options?.customSongs || [],
    notes: s.notes ?? undefined,
    isFinalized: s.is_finalized,
    finalizedAt: s.finalized_at ?? undefined,
    finalizedBy: s.finalized_by ?? undefined,
    createdAt: s.created_at,
  };
}
