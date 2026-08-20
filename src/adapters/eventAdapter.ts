import type { DbEvent } from '@/lib/dbTypes';
import type { ChurchEvent } from '@/types';

export function dbEventToUi(row: DbEvent): ChurchEvent {
  const schedule = row.schedules?.[0];
  const liturgy = row.liturgies?.[0];
  const hasRepertoire = Boolean(row.event_songs?.length);

  return {
    id: row.id,
    churchId: row.org_id,
    title: row.title || row.service_type || 'Culto',
    date: row.service_date,
    time: row.service_time ?? undefined,
    serviceType: row.service_type ?? undefined,
    theme: row.theme ?? undefined,
    notes: row.notes ?? undefined,
    musicGroupId: row.group_id ?? undefined,
    createdAt: row.created_at,
    scheduleId: schedule?.id,
    liturgyId: liturgy?.id,
    hasSchedule: Boolean(schedule?.id),
    hasLiturgy: Boolean(liturgy?.id),
    hasRepertoire,
    hasSetlist: hasRepertoire,
    shareCode: row.share_code ?? undefined,
    shareEnabled: Boolean(row.share_enabled),
    shareIncludeSongs: row.share_include_songs !== false,
    shareIncludeLiturgy: row.share_include_liturgy !== false,
    shareIncludeTeam: Boolean(row.share_include_team),
    shareExpiresAt: row.share_expires_at ?? null,
  };
}
